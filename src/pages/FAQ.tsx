import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HelpCircle, 
  ChevronDown, 
  Search, 
  Wallet, 
  Gamepad2, 
  ShieldCheck, 
  UserPlus, 
  MessageSquare,
  Zap,
  Info
} from 'lucide-react';

const FAQ_DATA = [
  {
    category: 'Registration & Account',
    icon: <UserPlus className="w-5 h-5 text-blue-400" />,
    questions: [
      {
        q: "How do I create an account?",
        a: "Simply click the 'Register' button on the landing page, provide your email, username, and password. You'll need to verify your email to access all features."
      },
      {
        q: "Can I have multiple accounts?",
        a: "No, DeeGames strictly enforces a one-account-per-user policy to ensure fair play and prevent bonus abuse."
      },
      {
        q: "What is KYC and why is it required?",
        a: "KYC (Know Your Customer) is a standard identity verification process. We require it for large withdrawals to comply with anti-money laundering regulations and ensure security."
      }
    ]
  },
  {
    category: 'Deposits & Withdrawals',
    icon: <Wallet className="w-5 h-5 text-amber-400" />,
    questions: [
      {
        q: "How do I deposit funds?",
        a: "Go to your Wallet, click 'Deposit', enter the amount, and follow the Paystack instructions. We support cards, bank transfers, and USSD."
      },
      {
        q: "How long do withdrawals take?",
        a: "Withdrawals are typically processed within 24-48 hours. Once approved, the funds should reach your bank account shortly after."
      },
      {
        q: "Are there any fees?",
        a: "We charge a small platform fee on match winnings. Deposit and withdrawal fees depend on the payment provider (Paystack)."
      }
    ]
  },
  {
    category: 'Game Requests & Matches',
    icon: <Gamepad2 className="w-5 h-5 text-emerald-400" />,
    questions: [
      {
        q: "How do I start a game?",
        a: "You can either create a new game request in a room or join an existing one. Once the required number of players join, the requester can start the match."
      },
      {
        q: "What happens if I disconnect during a match?",
        a: "If you disconnect, a 300-second countdown starts. If you don't reconnect before it ends, you'll be marked as defeated and lose your wager."
      },
      {
        q: "How is the winner determined?",
        a: "Winners are determined based on the specific rules of the game module being played. Winnings are automatically credited to the winner's wallet."
      }
    ]
  },
  {
    category: 'Fair Play & Support',
    icon: <ShieldCheck className="w-5 h-5 text-purple-400" />,
    questions: [
      {
        q: "How do you prevent cheating?",
        a: "We use a combination of server-side validation, anti-cheat monitoring, and player reporting to ensure a fair environment for everyone."
      },
      {
        q: "How do I report a player?",
        a: "You can report a player directly from the match room or from your recent opponents list. Our moderation team reviews all reports."
      },
      {
        q: "How can I contact support?",
        a: "You can submit a support ticket through our Support page. We aim to respond to all inquiries within 24 hours."
      }
    ]
  }
];

const FAQ: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedIndex(expandedIndex === id ? null : id);
  };

  const filteredFaq = FAQ_DATA.map(category => ({
    ...category,
    questions: category.questions.filter(q => 
      q.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
      q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-12">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/10">
            <HelpCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-4">Knowledge Base</h1>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Everything you need to know about DeeGames</p>
        </header>

        {/* Search */}
        <div className="relative mb-12">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for answers..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all shadow-xl"
          />
        </div>

        {/* FAQ List */}
        <div className="space-y-12">
          {filteredFaq.length === 0 ? (
            <div className="text-center py-20 opacity-40">
              <Info className="w-12 h-12 mx-auto mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest">No results found for "{searchQuery}"</p>
            </div>
          ) : (
            filteredFaq.map((category, catIdx) => (
              <div key={catIdx} className="space-y-4">
                <div className="flex items-center gap-3 px-2 mb-6">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    {category.icon}
                  </div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">{category.category}</h2>
                </div>
                
                <div className="space-y-3">
                  {category.questions.map((item, qIdx) => {
                    const id = `${catIdx}-${qIdx}`;
                    const isExpanded = expandedIndex === id;
                    
                    return (
                      <div 
                        key={id}
                        className={`rounded-2xl border transition-all ${
                          isExpanded 
                            ? 'bg-white/10 border-white/20 shadow-xl' 
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <button
                          onClick={() => toggleExpand(id)}
                          className="w-full p-5 flex items-center justify-between text-left"
                        >
                          <span className="text-sm font-black uppercase italic tracking-tight text-white/80">
                            {item.q}
                          </span>
                          <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-5 pt-0 text-xs text-gray-400 leading-relaxed font-medium">
                                <div className="h-px bg-white/10 mb-4" />
                                {item.a}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Still need help? */}
        <div className="mt-20 p-8 rounded-3xl bg-emerald-600/10 border border-emerald-500/20 text-center">
          <Zap className="w-8 h-8 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-xl font-black text-white uppercase italic tracking-tight mb-2">Still need help?</h3>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-6">Our support team is ready to assist you.</p>
          <button 
            onClick={() => window.location.href = '/support'}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
