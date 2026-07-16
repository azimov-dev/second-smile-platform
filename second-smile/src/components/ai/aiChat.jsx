import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { apiClient } from "../../api/client.js";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { useAuth } from "../../features/auth/useAuth";

export default function AiChat() {
  const { t } = useLanguage();
  const { token } = useAuth();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading || !token) return;

    const userText = input.trim();
    const userMessage = { role: "user", content: userText };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const historyForGemini = messages.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));

      const response = await apiClient("/ai/chat", {
        method: "POST",
        token,
        body: {
          message: userText,
          history: historyForGemini,
        },
      });

      if (!response?.reply) throw new Error("Bo'sh javob");

      const cleanReply = response.reply
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/_(.*?)_/g, "$1")
        .replace(/###? ?/g, "")
        .replace(/^\d+\.\s*/gm, "")
        .trim();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: cleanReply },
      ]);
    } catch (err) {
      console.error("AI Chat error:", err);
      setError(err.message || t("aiError") || "Xatolik yuz berdi");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Prevent zoom on input focus - Critical for iOS */}
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
      />

      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 text-3xl shadow-2xl hover:scale-110 transition-all md:h-16 md:w-16 md:text-4xl"
        aria-label="AI Chat"
      >
        🤖
      </button>

      {/* Chat Panel - Uses 100dvh to avoid keyboard resize issues */}
      {open && (
        <div className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-4xl md:inset-x-auto md:bottom-24 md:right-6 md:left-auto md:w-96 lg:w-[480px]">
          <div
            className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            style={{ height: "calc(100dvh - 100px)" }} // Key fix: uses dynamic viewport height
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-4 text-white">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 md:h-12 md:w-12">
                  <span className="text-2xl md:text-3xl">🤖</span>
                </div>
                <div>
                  <div className="text-lg font-bold md:text-xl">
                    {t("aiTitle") || "AI Yordamchi"}
                  </div>
                  <div className="text-xs opacity-90 md:text-sm">
                    {t("aiSubtitle")}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 hover:bg-white/20 transition"
              >
                <X className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 space-y-4">
              {messages.length === 0 && !loading && (
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                  <p className="text-sm font-semibold text-slate-800 mb-3">
                    {t("aiExampleTitle") || "Misol savollar:"}
                  </p>
                  <ul className="text-sm text-slate-600 space-y-2 list-disc pl-6">
                    <li>{t("aiExample1")}</li>
                    <li>{t("aiExample2")}</li>
                    <li>{t("aiExample3")}</li>
                  </ul>
                </div>
              )}

              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-sm ${
                      m.role === "user"
                        ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white"
                        : "bg-white border border-slate-200 text-slate-800"
                    }`}
                  >
                    <p className="text-sm md:text-base whitespace-pre-wrap">
                      {m.content}
                    </p>
                  </div>
                </div>
              ))}

              {error && (
                <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {loading && (
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <div className="flex space-x-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400"></span>
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.2s]"></span>
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.4s]"></span>
                  </div>
                  {t("aiTyping") || "Yozmoqda..."}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-slate-200 bg-white p-4">
              <div className="flex items-end gap-3">
                <textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("aiPlaceholder") || "Savolingizni yozing..."}
                  disabled={loading}
                  className="flex-1 resize-none rounded-xl border border-slate-300 px-5 py-3 text-sm md:text-base outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/20 transition disabled:bg-gray-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 p-3.5 text-white shadow-md hover:shadow-lg disabled:opacity-60 transition"
                >
                  <Send className="h-5 w-5 md:h-6 md:w-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
