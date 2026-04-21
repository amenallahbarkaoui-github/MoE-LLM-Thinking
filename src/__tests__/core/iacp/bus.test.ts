import { IACPBus } from '@/core/iacp/bus'
import type { IACPMessage } from '@/types/iacp'

function makeMsg(overrides: Partial<IACPMessage> & { id: string; fromAgentId: string; toAgentId: string }): IACPMessage {
  return {
    fromAgentName: overrides.fromAgentId,
    type: 'INFO_REQUEST',
    content: 'test',
    timestamp: Date.now(),
    round: 1,
    ...overrides,
  }
}

describe('IACPBus', () => {
  let bus: IACPBus

  beforeEach(() => {
    bus = new IACPBus(3) // max 3 messages per agent
  })

  it('should send and receive messages', () => {
    const msg = makeMsg({ id: 'm1', fromAgentId: 'a1', toAgentId: 'a2' })
    expect(bus.post(msg)).toBe(true)

    const received = bus.getMessagesFor('a2')
    expect(received).toHaveLength(1)
    expect(received[0].id).toBe('m1')
  })

  it('should broadcast to ALL', () => {
    const msg = makeMsg({ id: 'm1', fromAgentId: 'a1', toAgentId: 'ALL' })
    bus.post(msg)

    expect(bus.getMessagesFor('a2')).toHaveLength(1)
    expect(bus.getMessagesFor('a3')).toHaveLength(1)
  })

  it('should support direct agent-to-agent messaging', () => {
    const msg1 = makeMsg({ id: 'm1', fromAgentId: 'a1', toAgentId: 'a2' })
    const msg2 = makeMsg({ id: 'm2', fromAgentId: 'a1', toAgentId: 'a3' })
    bus.post(msg1)
    bus.post(msg2)

    expect(bus.getMessagesFor('a2')).toHaveLength(1)
    expect(bus.getMessagesFor('a3')).toHaveLength(1)
    // a4 should get nothing
    expect(bus.getMessagesFor('a4')).toHaveLength(0)
  })

  it('should enforce message limit per agent', () => {
    bus.post(makeMsg({ id: 'm1', fromAgentId: 'a1', toAgentId: 'a2' }))
    bus.post(makeMsg({ id: 'm2', fromAgentId: 'a1', toAgentId: 'a2' }))
    bus.post(makeMsg({ id: 'm3', fromAgentId: 'a1', toAgentId: 'a2' }))
    // 4th should be rejected
    const result = bus.post(makeMsg({ id: 'm4', fromAgentId: 'a1', toAgentId: 'a2' }))
    expect(result).toBe(false)
    expect(bus.getAllMessages()).toHaveLength(3)
  })

  it('should allow urgent messages to bypass limit', () => {
    bus.post(makeMsg({ id: 'm1', fromAgentId: 'a1', toAgentId: 'a2' }))
    bus.post(makeMsg({ id: 'm2', fromAgentId: 'a1', toAgentId: 'a2' }))
    bus.post(makeMsg({ id: 'm3', fromAgentId: 'a1', toAgentId: 'a2' }))
    // Urgent should bypass
    const result = bus.post(makeMsg({ id: 'm4', fromAgentId: 'a1', toAgentId: 'a2', priority: 'urgent' }))
    expect(result).toBe(true)
    expect(bus.getAllMessages()).toHaveLength(4)
  })

  it('should auto-set threadId from replyTo', () => {
    const original = makeMsg({ id: 'orig', fromAgentId: 'a1', toAgentId: 'a2' })
    bus.post(original)

    const reply = makeMsg({ id: 'reply1', fromAgentId: 'a2', toAgentId: 'a1', replyTo: 'orig' })
    bus.post(reply)

    const all = bus.getAllMessages()
    const replyMsg = all.find(m => m.id === 'reply1')
    expect(replyMsg?.threadId).toBe('orig')
  })

  it('should return ordered thread messages', () => {
    const m1 = makeMsg({ id: 't1', fromAgentId: 'a1', toAgentId: 'a2', timestamp: 100 })
    bus.post(m1)

    const m2 = makeMsg({ id: 't2', fromAgentId: 'a2', toAgentId: 'a1', replyTo: 't1', timestamp: 200 })
    bus.post(m2)

    const m3 = makeMsg({ id: 't3', fromAgentId: 'a1', toAgentId: 'a2', replyTo: 't1', timestamp: 300 })
    bus.post(m3)

    const thread = bus.getThread('t1')
    expect(thread).toHaveLength(3)
    expect(thread[0].timestamp).toBeLessThanOrEqual(thread[1].timestamp)
    expect(thread[1].timestamp).toBeLessThanOrEqual(thread[2].timestamp)
  })

  it('should sort by priority (urgent first)', () => {
    bus.post(makeMsg({ id: 'm1', fromAgentId: 'a1', toAgentId: 'ALL', priority: 'low' }))
    bus.post(makeMsg({ id: 'm2', fromAgentId: 'a2', toAgentId: 'ALL', priority: 'urgent' }))
    bus.post(makeMsg({ id: 'm3', fromAgentId: 'a3', toAgentId: 'ALL', priority: 'normal' }))

    const messages = bus.getMessagesFor('a4')
    expect(messages[0].priority).toBe('urgent')
    expect(messages[messages.length - 1].priority).toBe('low')
  })

  it('should track stats', () => {
    bus.post(makeMsg({ id: 'm1', fromAgentId: 'a1', toAgentId: 'a2', type: 'INFO_REQUEST' }))
    bus.post(makeMsg({ id: 'm2', fromAgentId: 'a1', toAgentId: 'a2', type: 'OPINION_SHARE', priority: 'urgent' }))

    const stats = bus.getStats()
    expect(stats.totalMessages).toBe(2)
    expect(stats.messagesByType['INFO_REQUEST']).toBe(1)
    expect(stats.messagesByType['OPINION_SHARE']).toBe(1)
    expect(stats.messagesByPriority['urgent']).toBe(1)
  })

  it('should clear all messages', () => {
    bus.post(makeMsg({ id: 'm1', fromAgentId: 'a1', toAgentId: 'a2' }))
    bus.clear()
    expect(bus.getAllMessages()).toHaveLength(0)
    expect(bus.getStats().totalMessages).toBe(0)
  })
})
