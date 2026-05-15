"use client";

import React, { useEffect, useRef, useState } from "react";

import { Bot, Loader2, MessageSquare, Send, X } from "lucide-react";

import { generateWaterAdvice } from "../services/geminiService";
import { ChatMessage } from "../types";

const AIChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Welcome to floodRIx. I am your Water Resource Assistant. How can I help you today?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const aiResponse = await generateWaterAdvice(input);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: aiResponse || "I'm sorry, I couldn't process that request.",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Our AI systems are currently being maintained. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end max-w-[calc(100vw-48px)]">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-[300px] sm:w-80 md:w-96 h-[500px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 mb-4 transform origin-bottom-right animate-in fade-in zoom-in duration-300">
          <div className="bg-brand-red p-6 flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold leading-none text-sm">
                  floodRIx Assistant
                </h4>
                <span className="text-[10px] text-white/70 uppercase tracking-widest">
                  Powered by Gemini
                </span>
              </div>
            </div>
            <X
              className="w-5 h-5 cursor-pointer opacity-70 hover:opacity-100"
              onClick={() => setIsOpen(false)}
            />
          </div>

          <div
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50"
            data-lenis-prevent
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.role === "user"
                      ? "bg-brand-red text-white rounded-br-none shadow-md"
                      : "bg-white text-gray-700 shadow-sm border border-gray-100 rounded-bl-none"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-teal" />
                  <span className="text-[10px] text-gray-400 italic">
                    Analyzing water data...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about water conservation..."
              className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-red/30"
            />
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="bg-brand-red text-white p-2 rounded-full hover:bg-brand-red/90 disabled:opacity-50 transition-all shadow-md active:scale-90"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-brand-red text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all group relative"
      >
        {isOpen ? (
          <X className="w-8 h-8" />
        ) : (
          <MessageSquare className="w-8 h-8" />
        )}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-teal rounded-full animate-ping" />
        )}
      </button>
    </div>
  );
};

export default AIChatbot;
