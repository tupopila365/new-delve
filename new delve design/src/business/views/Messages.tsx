import { useState } from "react";
import { Search, Send, Paperclip, MoreHorizontal, ChevronLeft, AlertCircle } from "lucide-react";
import { messages } from "../data/mock";

type Message = typeof messages[0];

const mockThread = [
  { id: 1, from: "traveler", text: "Hi! We are really excited about the safari. Will the Land Cruiser be air-conditioned for the midday game drive? It can get very hot.", time: "10:00 AM" },
  { id: 2, from: "business", text: "Hello Sophie! Great question. Yes, all our Land Cruisers have full air conditioning. We also recommend bringing a light jacket for early morning game drives when it can be cooler.", time: "10:20 AM" },
  { id: 3, from: "traveler", text: "Will the Land Cruiser be air-conditioned for the midday game drive?", time: "10:24 AM" },
];

export default function Messages() {
  const [selected, setSelected] = useState<Message | null>(null);
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [showMobile, setShowMobile] = useState(false);

  const filtered = messages.filter(m =>
    m.traveler.toLowerCase().includes(search.toLowerCase()) ||
    m.subject.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (m: Message) => {
    setSelected(m);
    setShowMobile(true);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversation List */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-[#DDD6CA] bg-white flex flex-col shrink-0 ${showMobile && selected ? "hidden md:flex" : "flex"}`}>
        <div className="px-4 pt-5 pb-3 border-b border-[#DDD6CA]">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-[#1A1814]">Messages</h1>
            <span className="bg-[#5F2FC9] text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {messages.filter(m => m.unread).length}
            </span>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6F695F]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-8 pr-3 py-2 bg-[#FAF8F4] border border-[#DDD6CA] rounded-lg text-sm placeholder:text-[#6F695F] focus:outline-none focus:border-[#8C52FF]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#F0EBE3]">
          {filtered.map(m => (
            <button
              key={m.id}
              onClick={() => handleSelect(m)}
              className={`w-full text-left px-4 py-3.5 hover:bg-[#FAF8F4] transition-colors flex items-start gap-3 ${selected?.id === m.id ? "bg-purple-50" : ""}`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${m.unread ? "bg-[#5F2FC9] text-white" : "bg-purple-100 text-purple-700"}`}>
                {m.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${m.unread ? "font-semibold text-[#1A1814]" : "font-medium text-[#1A1814]"}`}>{m.traveler}</span>
                  <span className="text-xs text-[#6F695F] shrink-0">{m.time}</span>
                </div>
                <p className={`text-xs mt-0.5 truncate ${m.unread ? "text-[#1A1814]" : "text-[#6F695F]"}`}>{m.lastMessage}</p>
                {m.bookingRef && (
                  <span className="text-[10px] text-[#8C52FF] font-medium mt-0.5 block">{m.bookingRef}</span>
                )}
              </div>
              {m.unread && <div className="w-2 h-2 rounded-full bg-[#8C52FF] mt-1.5 shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* Thread */}
      <div className={`flex-1 flex flex-col bg-[#FAF8F4] ${!showMobile && !selected ? "hidden md:flex" : "flex"}`}>
        {selected ? (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 px-5 py-3.5 bg-white border-b border-[#DDD6CA]">
              <button onClick={() => setShowMobile(false)} className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[#6F695F] hover:bg-[#F0EBE3]">
                <ChevronLeft size={16} />
              </button>
              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">{selected.avatar}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1A1814]">{selected.traveler}</p>
                {selected.bookingRef && <p className="text-xs text-[#8C52FF]">{selected.bookingRef}</p>}
              </div>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6F695F] hover:bg-[#F0EBE3]">
                <MoreHorizontal size={15} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
              {mockThread.map(msg => (
                <div key={msg.id} className={`flex ${msg.from === "business" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    msg.from === "business"
                      ? "bg-[#5F2FC9] text-white rounded-br-sm"
                      : "bg-white border border-[#DDD6CA] text-[#1A1814] rounded-bl-sm"
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <p className={`text-[10px] mt-1.5 ${msg.from === "business" ? "text-white/60" : "text-[#6F695F]"}`}>{msg.time}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Composer */}
            <div className="bg-white border-t border-[#DDD6CA] p-4">
              <div className="bg-[#FAF8F4] border border-[#DDD6CA] rounded-xl p-3 flex items-end gap-3">
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Reply to traveler…"
                  rows={2}
                  className="flex-1 bg-transparent text-sm text-[#1A1814] placeholder:text-[#6F695F] resize-none focus:outline-none"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6F695F] hover:bg-[#F0EBE3] transition-colors">
                    <Paperclip size={14} />
                  </button>
                  <button
                    disabled={!reply.trim()}
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#5F2FC9] text-white hover:bg-[#4E26A8] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-[#6F695F] mt-2 flex items-center gap-1">
                <AlertCircle size={10} /> Internal notes are never visible to travelers
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                <Search size={20} className="text-purple-600" />
              </div>
              <p className="text-sm font-medium text-[#1A1814]">Select a conversation</p>
              <p className="text-xs text-[#6F695F] mt-1">Choose a conversation from the list to read and reply</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
