import type { Metadata } from "next";
import { ChatView } from "@/components/chat/ChatView";

export const metadata: Metadata = { title: "Chat" };

export default function NewChatPage() {
  return <ChatView />;
}
