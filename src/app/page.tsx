import Link from "next/link";
import { Brain, MessageSquare, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Users,
    title: "70 Expert Agents",
    description: "Specialized AI agents across technology, business, law, science, and more.",
  },
  {
    icon: MessageSquare,
    title: "Council Discussion",
    description: "Agents discuss and debate to reach well-rounded, comprehensive answers.",
  },
  {
    icon: Zap,
    title: "IACP Protocol",
    description: "Inter-agent communication enables real-time collaboration and reasoning.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center max-w-2xl mx-auto">
        {/* Logo */}
        <div className="mx-auto mb-8 h-16 w-16 rounded-2xl bg-primary flex items-center justify-center">
          <Brain className="h-8 w-8 text-primary-foreground" />
        </div>

        {/* Hero */}
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Deep Thinking AI
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto">
          A multi-agent council of up to 70 specialized AI experts that analyze your questions from every angle.
        </p>

        {/* CTA */}
        <div className="mt-8">
          <Link href="/chat">
            <Button size="lg" className="px-8">
              Start a conversation
            </Button>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
        {features.map((f) => (
          <Card key={f.title} className="border shadow-sm">
            <CardContent className="pt-6">
              <f.icon className="h-5 w-5 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-sm">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {f.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
