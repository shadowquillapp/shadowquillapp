import ChatClient from "@/app/chat/_components/ChatClient";
import ModelConfigGate from "../../components/ModelConfigGate";

export default async function ChatPage() {
  return (
    <main className="flex w-[100vw] bg-surface-0 text-light h-full">
      <ModelConfigGate>
        <div className="flex h-full w-full">
          <ChatClient />
        </div>
      </ModelConfigGate>
    </main>
  );
}


