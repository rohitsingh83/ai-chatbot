import type { Accent, Category } from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

export const CATEGORIES: { id: Category; label: string; emoji: string; hint: string }[] = [
  { id: "casual", label: "Casual", emoji: "💬", hint: "Friendly, everyday chat" },
  { id: "professional", label: "Professional", emoji: "💼", hint: "Precise and structured" },
  { id: "creative", label: "Creative", emoji: "🎨", hint: "Imaginative and playful" },
  { id: "coding", label: "Coding", emoji: "💻", hint: "Senior engineer mode" },
];

export const ACCENTS: { id: Accent; label: string; from: string; to: string }[] = [
  { id: "violet", label: "Violet", from: "#7c5cff", to: "#38bdf8" },
  { id: "blue", label: "Ocean", from: "#3b82f6", to: "#22d3ee" },
  { id: "emerald", label: "Emerald", from: "#10b981", to: "#84cc16" },
  { id: "rose", label: "Sunset", from: "#f43f5e", to: "#fb923c" },
  { id: "amber", label: "Amber", from: "#f59e0b", to: "#ef4444" },
];

export const SUGGESTIONS: Record<Category, { title: string; prompt: string }[]> = {
  casual: [
    { title: "Plan my weekend", prompt: "Suggest a relaxing but fun weekend plan in the city" },
    { title: "Tell me a joke", prompt: "Tell me a programming joke" },
    { title: "Fun fact", prompt: "Explain why the sky is blue like I'm five" },
    { title: "Dinner idea", prompt: "What can I cook tonight with rice, eggs and spinach?" },
  ],
  professional: [
    { title: "Write an email", prompt: "Write a polite email asking my manager for a deadline extension" },
    { title: "Summarise", prompt: "Summarise the benefits of WebSockets for a product manager" },
    { title: "Interview prep", prompt: "Give me 5 common internship interview questions with tips" },
    { title: "Plan a project", prompt: "Create a 2-week plan to build a chatbot web app" },
  ],
  creative: [
    { title: "Brainstorm names", prompt: "Give me 5 creative names for a coffee shop run by robots" },
    { title: "Short story", prompt: "Write the opening of a sci-fi story about a robot learning to dream" },
    { title: "Startup ideas", prompt: "Brainstorm 5 startup ideas for college students" },
    { title: "Write a poem", prompt: "Write a haiku about debugging at midnight" },
  ],
  coding: [
    { title: "Explain a concept", prompt: "Explain how WebSockets work" },
    { title: "Write a function", prompt: "Write a Python function that returns Fibonacci numbers" },
    { title: "React component", prompt: "Write a React counter component with Tailwind" },
    { title: "SQL query", prompt: "Write a SQL query for the top 5 customers by revenue" },
  ],
};

export const DEMO_ACCOUNTS = {
  user: { email: "demo@nova.dev", password: "Password123" },
  admin: { email: "admin@nova.dev", password: "Password123" },
};
