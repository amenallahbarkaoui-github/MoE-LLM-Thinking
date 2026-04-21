// Mock the prisma import used by query-intelligence
jest.mock('@/lib/db', () => ({
  prisma: {
    session: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}))

import { QueryIntelligence } from '@/lib/query-intelligence'

describe('QueryIntelligence', () => {
  let qi: QueryIntelligence

  beforeEach(() => {
    qi = new QueryIntelligence()
  })

  describe('analyzeQuery - ambiguity detection', () => {
    it('should detect short queries as ambiguous', () => {
      const result = qi.analyzeQuery('help')
      expect(result.isAmbiguous).toBe(true)
      expect(result.ambiguityReasons.some(r => r.includes('short'))).toBe(true)
    })

    it('should detect vague pronouns', () => {
      const result = qi.analyzeQuery('Can you explain it in more detail please?')
      expect(result.isAmbiguous).toBe(true)
      expect(result.ambiguityReasons.some(r => r.includes('pronoun'))).toBe(true)
    })

    it('should detect no question structure', () => {
      const result = qi.analyzeQuery('machine learning algorithms deep neural networks')
      expect(result.isAmbiguous).toBe(true)
      expect(result.ambiguityReasons.some(r => r.includes('question structure'))).toBe(true)
    })

    it('should not flag clear questions as ambiguous for question structure', () => {
      const result = qi.analyzeQuery('What is the best programming language for web development?')
      // Should not have "No clear question" reason
      expect(result.ambiguityReasons.some(r => r.includes('No clear question'))).toBe(false)
    })
  })

  describe('analyzeQuery - complexity classification', () => {
    it('should classify simple queries', () => {
      const result = qi.analyzeQuery('What is the meaning of life?')
      expect(result.complexity).toBe('simple')
    })

    it('should classify moderate queries (multiple topics)', () => {
      // "code" => technology, "design" => creativity
      const result = qi.analyzeQuery('How can I design a code architecture for my software application with good user experience?')
      expect(['moderate', 'complex']).toContain(result.complexity)
    })

    it('should classify complex queries (many topics or very long)', () => {
      const longQuery = 'How can I build a software system that handles legal compliance, manages business strategy, incorporates machine learning research, and provides creative design solutions?'
      const result = qi.analyzeQuery(longQuery)
      expect(result.complexity).toBe('complex')
    })
  })

  describe('analyzeQuery - estimated agent count', () => {
    it('should return 4 agents for simple queries', () => {
      const result = qi.analyzeQuery('What is the meaning of life?')
      expect(result.estimatedAgentCount).toBe(4)
    })

    it('should return 12 agents for complex queries', () => {
      const longQuery = 'How can I build a software system that handles legal compliance, manages business strategy, incorporates machine learning research, and provides creative design solutions?'
      const result = qi.analyzeQuery(longQuery)
      expect(result.estimatedAgentCount).toBe(12)
    })
  })

  describe('optimizeQuery', () => {
    it('should expand abbreviations', () => {
      const result = qi.optimizeQuery('How to build an ai system?')
      expect(result).toContain('artificial intelligence')
    })

    it('should collapse whitespace', () => {
      const result = qi.optimizeQuery('  hello    world  ')
      expect(result).toBe('hello world')
    })

    it('should preserve case on expansion for uppercase first letter', () => {
      const result = qi.optimizeQuery('AI is great')
      expect(result).toContain('Artificial intelligence')
    })
  })

  describe('generateClarifications', () => {
    it('should generate clarifications for short queries', () => {
      const clarifications = qi.generateClarifications('help', ['Query is very short — consider adding more detail'])
      expect(clarifications.length).toBeGreaterThan(0)
      expect(clarifications.some(c => c.includes('more context'))).toBe(true)
    })

    it('should generate clarifications for pronoun issues', () => {
      const clarifications = qi.generateClarifications('explain it', ['Contains pronoun "it" without clear referent'])
      expect(clarifications.some(c => c.includes('pronoun'))).toBe(true)
    })

    it('should generate clarifications for no question structure', () => {
      const clarifications = qi.generateClarifications('test query', ['No clear question structure detected'])
      expect(clarifications.some(c => c.includes('rephrasing'))).toBe(true)
    })

    it('should cap clarifications at 4', () => {
      const reasons = [
        'Query is very short — consider adding more detail',
        'Contains pronoun "it" without clear referent',
        'No clear question structure detected',
        'Multiple unrelated topics detected — try narrowing down',
        'Extra reason',
      ]
      const clarifications = qi.generateClarifications('test', reasons)
      expect(clarifications.length).toBeLessThanOrEqual(4)
    })
  })

  describe('non-ambiguous queries', () => {
    it('should pass through clear queries with question mark', () => {
      const result = qi.analyzeQuery('How does photosynthesis work in plants?')
      // This has a question structure and is specific enough
      expect(result.suggestedClarifications.length).toBe(0)
    })
  })
})
