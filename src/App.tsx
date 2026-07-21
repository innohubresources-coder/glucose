import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Clock, 
  ArrowRight, 
  Lock, 
  CheckCircle, 
  AlertCircle, 
  BookOpen, 
  Heart, 
  Smile, 
  X, 
  Mail, 
  Check, 
  Flame, 
  Star, 
  ThumbsUp, 
  HelpCircle,
  TrendingUp,
  Award
} from "lucide-react";
import { SubscribeResponse, BrevoConfig } from "./types";

export default function App() {
  // Brevo Config Status
  const [config, setConfig] = useState<BrevoConfig>({
    brevoConfigured: false,
    listId: null
  });

  // Form states
  const [leadEmail, setLeadEmail] = useState("");
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadResult, setLeadResult] = useState<SubscribeResponse | null>(null);

  const [exitEmail, setExitEmail] = useState("");
  const [exitLoading, setExitLoading] = useState(false);
  const [exitResult, setExitResult] = useState<SubscribeResponse | null>(null);

  // Popup Visibility State
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupTriggered, setPopupTriggered] = useState(false);

  // Timer states
  const [hours, setHours] = useState("24");
  const [minutes, setMinutes] = useState("00");
  const [seconds, setSeconds] = useState("00");

  // Load Brevo config status
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch((err) => console.error("Error fetching config:", err));
  }, []);

  // Evergreen Timer Logic
  useEffect(() => {
    const timerKey = "glucoseResetTimerStart";
    let startTimeStr = localStorage.getItem(timerKey);
    let startTime = startTimeStr ? parseInt(startTimeStr, 10) : null;

    if (!startTime || isNaN(startTime)) {
      startTime = Date.now();
      localStorage.setItem(timerKey, startTime.toString());
    }

    const totalDuration = 24 * 60 * 60 * 1000; // 24 hours
    let endTime = startTime + totalDuration;

    // If the timer completely expired in a previous session, reset to keep it evergreen
    if (Date.now() > endTime) {
      startTime = Date.now();
      localStorage.setItem(timerKey, startTime.toString());
      endTime = startTime + totalDuration;
    }

    const updateTimer = () => {
      const now = Date.now();
      let timeLeft = endTime - now;

      if (timeLeft <= 0) {
        // Reset the timer to make it evergreen for the next cycle
        const newStart = Date.now();
        localStorage.setItem(timerKey, newStart.toString());
        timeLeft = totalDuration;
        endTime = newStart + totalDuration;
      }

      const h = Math.floor(timeLeft / (1000 * 60 * 60));
      const m = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((timeLeft % (1000 * 60)) / 1000);

      setHours(String(h).padStart(2, "0"));
      setMinutes(String(m).padStart(2, "0"));
      setSeconds(String(s).padStart(2, "0"));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  // Exit Intent Detector
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      // Trigger if mouse leaves from the top of the viewport
      if (e.clientY < 5 && !popupTriggered) {
        // Don't trigger if already opted-in
        if (localStorage.getItem("glucoseCheatsheetOptIn") !== "true") {
          setIsPopupOpen(true);
          setPopupTriggered(true);
        }
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [popupTriggered]);

  // Handle Form Submissions
  const handleFormSubmit = async (
    e: FormEvent,
    email: string,
    source: string,
    setLoading: (loading: boolean) => void,
    setResult: (res: SubscribeResponse | null) => void,
    clearEmail: () => void
  ) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setResult({ success: false, error: "Please enter a valid email address." });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim(), source }),
      });

      const data: SubscribeResponse = await response.json();
      setLoading(false);
      setResult(data);

      if (data.success) {
        localStorage.setItem("glucoseCheatsheetOptIn", "true");
        clearEmail();
        // If it's the exit popup, close it after 4 seconds
        if (source === "exit-popup") {
          setTimeout(() => {
            setIsPopupOpen(false);
          }, 4000);
        }
      }
    } catch (err: any) {
      setLoading(false);
      setResult({
        success: false,
        error: "Failed to connect to subscription server. Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gold-50 font-sans selection:bg-gold-200 selection:text-charcoal relative">
      
      {/* ==================== BREVO CONNECTION STATUS HEADER ==================== */}
      <div className="bg-charcoal text-white text-xs py-2 px-4 flex justify-between items-center flex-wrap gap-2 border-b border-gold-500/20">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.brevoConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${config.brevoConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>
          <span className="font-mono text-[10px] tracking-wider uppercase">
            {config.brevoConfigured 
              ? `Brevo Connected (List ID: ${config.listId || "Default"})` 
              : "Brevo Sandbox/Simulation Mode"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsPopupOpen(true)}
            className="text-[10px] text-gold-500 hover:text-gold-100 underline transition duration-200 cursor-pointer font-semibold uppercase tracking-wider"
          >
            ⚙️ Test Exit Popup Form
          </button>
          <span className="text-[10px] text-muted hidden md:inline">
            Status: <strong className="text-gold-500">Active Sequence</strong>
          </span>
        </div>
      </div>

      {/* ==================== TOP BAR ==================== */}
      <header className="border-b border-gold-100 py-4">
        <div className="max-w-4xl mx-auto px-6 flex justify-between items-center">
          <div className="font-serif font-bold text-xl text-charcoal tracking-tight">
            Alenna <span className="text-gold-500 font-normal italic">Rae Willis</span>
          </div>
          <a 
            href="https://innohubresources.com/funnel-evergreen-checkout-12/" 
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-white px-5 py-2 rounded-full font-semibold text-xs uppercase tracking-wider transition-all duration-300"
          >
            📖 Buy Now – $17
          </a>
        </div>
      </header>

      {/* ==================== HERO SECTION ==================== */}
      <section className="max-w-3xl mx-auto px-6 pt-12 pb-8 text-center">
        {/* Hot Badge */}
        <div className="inline-flex items-center gap-1.5 bg-gold-100 text-charcoal px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase mb-6 shadow-sm border border-gold-200/50">
          <Flame className="w-3.5 h-3.5 text-gold-500 animate-pulse" />
          <span>#1 New Release in Metabolic Health</span>
        </div>

        {/* Main Title */}
        <h1 className="font-serif text-4xl md:text-6xl font-bold tracking-tight text-charcoal leading-[1.1] mb-6">
          The <span className="text-gold-500 italic relative">Glucose<span className="absolute bottom-1 left-0 w-full h-[6px] bg-gold-500/10 rounded"></span></span> Reset
        </h1>
        
        <p className="font-serif text-lg md:text-2xl text-gold-500 italic mb-4 max-w-2xl mx-auto">
          "30 Days to Stop Cravings, Banish Brain Fog, and Burn Fat"
        </p>

        <p className="text-muted text-base md:text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
          By <strong>Alenna Rae Willis</strong> – The metabolism mentor who helped <strong>2,300+ women</strong> fix their glucose rollercoaster and finally feel like themselves again.
        </p>

        {/* Cover Image Wrapper with Interactive Zoom */}
        <div className="relative max-w-md mx-auto mb-10 group">
          <div className="absolute inset-0 bg-gold-500/10 rounded-2xl blur-3xl group-hover:blur-2xl transition-all duration-300 -z-10"></div>
          <div className="rounded-2xl shadow-xl border border-gold-200/50 overflow-hidden transform group-hover:scale-[1.01] transition-transform duration-500">
            <img 
              src="https://innohubresources.com/wp-content/uploads/2026/07/1784449219.png" 
              alt="The Glucose Reset Book Cover" 
              className="w-full h-auto object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="absolute -bottom-4 right-4 bg-charcoal text-white text-[10px] uppercase tracking-widest font-mono px-3 py-1 rounded-full border border-gold-500/30">
            Interactive PDF + Book
          </div>
        </div>

        {/* Urgency Alert Bar */}
        <div className="inline-flex items-center gap-2 bg-gold-100 text-charcoal px-6 py-2.5 rounded-full text-xs md:text-sm font-semibold mb-6 border border-gold-200">
          <Clock className="w-4 h-4 text-gold-500 animate-pulse" />
          <span>Launch Special – 60% Off Direct Today!</span>
        </div>

        {/* Pricing Layout */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <span className="text-xl text-muted/60 line-through font-light">$47</span>
          <span className="text-5xl md:text-6xl font-extrabold text-gold-500 tracking-tight animate-pulse">$17</span>
          <span className="bg-gold-500/10 text-gold-500 text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full">
            Limited Time
          </span>
        </div>

        {/* REAL-TIME COUNTDOWN TIMER */}
        <div className="bg-charcoal text-white rounded-2xl p-5 mb-8 max-w-sm mx-auto border border-gold-500/30 shadow-lg">
          <p className="text-[10px] text-gold-500 uppercase tracking-widest font-bold mb-3">
            ⏳ Special Discount Expires In:
          </p>
          <div className="flex items-center justify-center gap-3 font-mono">
            <div className="bg-white/5 rounded-xl px-4 py-3 min-w-[70px]">
              <span className="block text-2xl md:text-3xl font-bold text-white leading-none">{hours}</span>
              <span className="text-[9px] uppercase tracking-wider text-muted font-sans mt-1 block">Hours</span>
            </div>
            <span className="text-gold-500 font-serif text-2xl">:</span>
            <div className="bg-white/5 rounded-xl px-4 py-3 min-w-[70px]">
              <span className="block text-2xl md:text-3xl font-bold text-white leading-none">{minutes}</span>
              <span className="text-[9px] uppercase tracking-wider text-muted font-sans mt-1 block">Mins</span>
            </div>
            <span className="text-gold-500 font-serif text-2xl">:</span>
            <div className="bg-white/5 rounded-xl px-4 py-3 min-w-[70px]">
              <span className="block text-2xl md:text-3xl font-bold text-white leading-none">{seconds}</span>
              <span className="text-[9px] uppercase tracking-wider text-muted font-sans mt-1 block">Secs</span>
            </div>
          </div>
        </div>

        {/* Primary Call to Action */}
        <div className="mb-4">
          <a 
            href="https://innohubresources.com/funnel-evergreen-checkout-12/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-gold-500 hover:bg-gold-600 text-white font-bold text-lg md:text-xl px-12 py-5 rounded-full transition-all duration-300 transform hover:-translate-y-1 shadow-[0_8px_32px_rgba(184,134,61,0.4)] hover:shadow-[0_12px_40px_rgba(184,134,61,0.55)] cursor-pointer"
          >
            <span>🚀 Get Instant Access Now</span>
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>

        <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
          🔒 <strong>100% Money-Back Guarantee:</strong> Try it fully risk-free for 60 days. If you are not absolutely thrilled, email me for a full refund.
        </p>
      </section>

      {/* ==================== SOCIAL PROOF BAR ==================== */}
      <section className="bg-white/60 border-y border-gold-100 py-8 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-charcoal">⭐ 4.9/5</div>
            <div className="text-xs text-muted mt-1">Average Reader Rating</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-charcoal">2,300+</div>
            <div className="text-xs text-muted mt-1">Metabolisms Restored</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-charcoal">38 Pages</div>
            <div className="text-xs text-muted mt-1">Actionable Science & Guides</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-charcoal">60 Days</div>
            <div className="text-xs text-muted mt-1">Risk-Free Tryout Policy</div>
          </div>
        </div>
      </section>

      {/* ==================== THE PAIN SECTION ==================== */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="bg-gold-100/50 rounded-3xl p-8 md:p-12 border border-gold-200">
          <span className="text-[10px] text-gold-500 tracking-widest font-bold uppercase block mb-2">
            The Hard Truth
          </span>
          <h2 className="font-serif text-2xl md:text-3.5xl font-bold text-charcoal leading-snug mb-4">
            Your Metabolism Isn't Broken. Your Glucose Is on a Rollercoaster.
          </h2>
          <p className="text-muted text-sm md:text-base mb-8">
            If any of these sound familiar, you're not alone — and it's <strong>not</strong> your lack of willpower:
          </p>

          <ul className="space-y-4">
            {[
              "You are starving 1–2 hours after eating a large, 'healthy' meal.",
              "The 3 PM energy crash hits you like a truck, forcing you to seek caffeine or sweets.",
              "Stubborn belly fat refusing to budge no matter how much you diet.",
              "Pervasive brain fog that makes simple decisions feel like wading through mud.",
              "Tried keto, low-carb, or fasting only to end up exhausted and back at square one."
            ].map((item, index) => (
              <li key={index} className="flex gap-3 items-start">
                <div className="mt-1 flex-shrink-0 bg-gold-500/10 text-gold-500 rounded-full p-1">
                  <X className="w-3.5 h-3.5 text-gold-500 stroke-[3]" />
                </div>
                <span className="text-charcoal/90 text-sm md:text-base leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 pt-6 border-t border-gold-200/60">
            <p className="text-gold-500 font-semibold text-base md:text-lg">
              Here is what is actually happening: <span className="text-charcoal italic">Your glucose spikes, then crashes, sending your body into crisis-starvation mode. This ebook fixes that cycle in 30 days.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ==================== BENEFITS SECTION ==================== */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <span className="text-[10px] text-gold-500 tracking-widest font-bold uppercase block mb-2">
            The Solution
          </span>
          <h2 className="font-serif text-3xl md:text-4.5xl font-bold text-charcoal">
            Flatten the Curve. Reset Your Energy.
          </h2>
          <p className="text-muted mt-2 max-w-xl mx-auto text-sm md:text-base">
            The Glucose Reset isn't a restrictive diet. It's a collection of simple science hacks to synchronize your body's energy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              title: "🍽️ Eat Deliciously Without Guilt",
              desc: "No calorie counting or severe restrictions. Learn strategic food combinations that naturally lower spikes while keeping you full."
            },
            {
              title: "⚡ Crush Cravings For Good",
              desc: "By stopping the glucose peak-and-drop, you shut off the brain signals that scream for rapid-acting sugar and carbs."
            },
            {
              title: "🧠 Instant, Stable Mental Focus",
              desc: "Say goodbye to brain fog. Keep brain cell fuel levels even from the minute you wake up until you wind down."
            },
            {
              title: "🔥 Ignite Natural Fat Burning",
              desc: "When insulin levels are low and stable, your cells can finally access and mobilize stored body fat for steady fuel."
            }
          ].map((benefit, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gold-100 shadow-sm hover:shadow-md hover:border-gold-200 transition-all duration-300">
              <h3 className="font-serif text-lg font-bold text-charcoal mb-2">{benefit.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{benefit.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== CHECKLIST & VALUE SECTION ==================== */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <span className="text-[10px] text-gold-500 tracking-widest font-bold uppercase block mb-2">
            What's Inside
          </span>
          <h2 className="font-serif text-3xl font-bold text-charcoal">
            The Complete 38-Page Blueprint
          </h2>
          <p className="text-muted mt-1 text-sm">
            Everything you need is packed into this practical, beautiful handbook:
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 md:p-8 border border-gold-100 shadow-sm space-y-4">
          {[
            { title: "The 30-Day Step-by-Step Reset Calendar", subtitle: "Clear daily guidelines to flatten your curve with zero guesswork." },
            { title: "20 Fast & Gorgeous Glucose-Friendly Recipes", subtitle: "Delicious breakfast bowls, steady lunches, dinners, and sweet snacks." },
            { title: "The 'Dining-Out' Hacks Cheat Sheet", subtitle: "How to minimize spikes at fast-food joints, pizza parties, or takeout." },
            { title: "7-Day Warm-Up Phase & Smart Shopping Blueprint", subtitle: "Get fully organized with printable ingredient lists that save money." },
            { title: "The 30-Day Success Tracker", subtitle: "Printable habit matrix to keep you motivated and completely accountable." },
            { title: "The Maintenance Mode Protocol", subtitle: "The 80/20 rule that lets you enjoy life's sweet treats without rebounds." }
          ].map((item, i) => (
            <div key={i} className="flex gap-3 items-start pb-4 border-b border-gold-100 last:border-b-0 last:pb-0">
              <div className="mt-0.5 flex-shrink-0 text-gold-500">
                <Check className="w-5 h-5 stroke-[3.5]" />
              </div>
              <div>
                <h4 className="font-semibold text-charcoal text-sm md:text-base">{item.title}</h4>
                <p className="text-xs text-muted">{item.subtitle}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Free bonus item */}
        <div className="mt-6 bg-gold-500/5 border border-gold-500/20 rounded-2xl p-5 flex items-center gap-4">
          <div className="bg-gold-500 text-white rounded-xl p-3">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-gold-500 uppercase tracking-widest">Included Free Gift:</p>
            <p className="text-sm font-semibold text-charcoal">
              Printable Grocery Quick-Card + Mobile Cheat-Sheet (Value $19)
            </p>
          </div>
        </div>
      </section>

      {/* ==================== TESTIMONIALS ==================== */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <span className="text-[10px] text-gold-500 tracking-widest font-bold uppercase block mb-2">
            Real Results
          </span>
          <h2 className="font-serif text-3xl font-bold text-charcoal">
            What Busy Women Are Saying
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              stars: 5,
              quote: "I've tried everything. This is the first plan that actually made sense. My energy is through the roof, and I'm down 8 pounds in 3 weeks!",
              author: "Sarah, 42",
              outcome: "Lost 8 lbs • No sugar cravings"
            },
            {
              stars: 5,
              quote: "The brain fog is GONE. I can actually think clearly at work. And the recipes are so simple—I'm not a chef and I can make them.",
              author: "Jessica, 36",
              outcome: "Clearer focus • More energy"
            },
            {
              stars: 5,
              quote: "I was skeptical, but the 7-day prep made it so easy. I don't feel deprived. I feel like I finally understand my body.",
              author: "Maria, 51",
              outcome: "No bloating • Restorative sleep"
            },
            {
              stars: 5,
              quote: "The 3 PM slump is history. I used to need two coffees to get through the afternoon. Now I'm good with one and no sugar crash.",
              author: "Lauren, 29",
              outcome: "Sustained daily focus"
            }
          ].map((t, idx) => (
            <div key={idx} className="bg-white/80 rounded-2xl p-6 border border-gold-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex gap-0.5 text-gold-500 mb-3">
                  {[...Array(t.stars)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="italic text-sm text-charcoal/90 mb-4">"{t.quote}"</p>
              </div>
              <div className="pt-3 border-t border-gold-100/60 flex justify-between items-center text-xs">
                <span className="font-bold text-charcoal">{t.author}</span>
                <span className="text-gold-500 font-semibold bg-gold-500/5 px-2 py-0.5 rounded-full">{t.outcome}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== MEET ALENNA ==================== */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white/40 border border-gold-100 rounded-3xl p-8 md:p-10">
          <span className="text-[10px] text-gold-500 tracking-widest font-bold uppercase block mb-1">
            Your Mentor
          </span>
          <h2 className="font-serif text-2xl md:text-3.5xl font-bold text-charcoal mb-4">
            Hi, I'm Alenna Rae Willis
          </h2>
          
          <div className="prose text-charcoal/90 text-sm md:text-base space-y-4 leading-relaxed">
            <p>
              I used to be the woman who ate &ldquo;perfectly healthy&rdquo; but still felt exhausted, bloated, and ravenous every single afternoon.
            </p>
            <p>
              I ran the gauntlet of keto, veganism, and strict intermittent fasting, only to watch my weight bounce up and down while my energy hit rock bottom.
            </p>
            <p>
              Everything changed when I stepped away from the diet trends and looked directly at blood sugar biology. I realized my system wasn't broken—it was simply caught in a violent loop of insulin and glucose spikes.
            </p>
            <p className="font-semibold text-gold-500">
              Once I applied simple hacks to flatten my curve, the weight dropped, the cravings vanished, and my focus roared back. I created The Glucose Reset to deliver that exact playbook to you.
            </p>
          </div>
        </div>
      </section>

      {/* ==================== BREVO-CONNECTED INLINE LEAD MAGNET ==================== */}
      <section className="max-w-2xl mx-auto px-6 py-12" id="leadmagnet">
        <div className="bg-white rounded-3xl p-8 md:p-10 border-2 border-dashed border-gold-500 relative shadow-md">
          <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-gold-500 text-white text-[10px] uppercase tracking-widest font-bold px-4 py-1 rounded-full">
            🎁 FREE GIFT
          </div>

          <div className="text-center mt-2 mb-6">
            <h3 className="font-serif text-xl md:text-2xl font-bold text-charcoal">
              Not ready to buy yet?
            </h3>
            <p className="text-xs md:text-sm text-muted mt-2">
              Get my <strong>FREE 7-Day Glucose Flattening Cheatsheet</strong> featuring 3 rapid rules to stall cravings and boost focus, starting tomorrow morning.
            </p>
          </div>

          <div className="bg-gold-50/75 rounded-2xl p-5 mb-6 border border-gold-100">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-charcoal">
              <li className="flex gap-2 items-center">
                <CheckCircle className="w-3.5 h-3.5 text-gold-500 flex-shrink-0" />
                <span>The 40% Spike &ldquo;Food Order&rdquo; Hack</span>
              </li>
              <li className="flex gap-2 items-center">
                <CheckCircle className="w-3.5 h-3.5 text-gold-500 flex-shrink-0" />
                <span>3 Two-Minute breakfast upgrades</span>
              </li>
              <li className="flex gap-2 items-center">
                <CheckCircle className="w-3.5 h-3.5 text-gold-500 flex-shrink-0" />
                <span>The Vinegar hack for carb heavy meals</span>
              </li>
              <li className="flex gap-2 items-center">
                <CheckCircle className="w-3.5 h-3.5 text-gold-500 flex-shrink-0" />
                <span>5 high-fat emergency snack options</span>
              </li>
            </ul>
          </div>

          <AnimatePresence mode="wait">
            {!leadResult ? (
              <form 
                onSubmit={(e) => handleFormSubmit(e, leadEmail, "inline-lead", setLeadLoading, setLeadResult, () => setLeadEmail(""))}
                className="flex flex-col sm:flex-row gap-3"
              >
                <div className="flex-grow relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted w-4 h-4" />
                  <input 
                    type="email" 
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    placeholder="Enter your best email address..." 
                    className="w-full pl-11 pr-4 py-4 rounded-full border border-gold-200 bg-white text-sm focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all"
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={leadLoading}
                  className="bg-gold-500 hover:bg-gold-600 text-white font-bold text-sm px-8 py-4 rounded-full transition-all duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {leadLoading ? "Sending..." : "Send Free Guide"}
                </button>
              </form>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`rounded-2xl p-5 text-center ${leadResult.success ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'}`}
              >
                <div className="flex justify-center mb-2">
                  {leadResult.success ? (
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-8 h-8 text-rose-500" />
                  )}
                </div>
                <h4 className="font-bold text-sm">{leadResult.success ? "Successfully Joined!" : "Action Required"}</h4>
                <p className="text-xs mt-1">{leadResult.message || leadResult.error}</p>
                {leadResult.success && leadResult.simulated && (
                  <p className="text-[10px] text-amber-700 font-mono mt-3 bg-amber-50 rounded-lg p-2 border border-amber-200">
                    💡 Configure <strong>BREVO_API_KEY</strong> in the Secrets menu to route real-time contact automation directly to your live Brevo workflow.
                  </p>
                )}
                <button 
                  onClick={() => setLeadResult(null)}
                  className="text-xs font-semibold underline mt-3 cursor-pointer opacity-70 hover:opacity-100"
                >
                  Submit another email
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-[10px] text-muted text-center mt-3">
            🔒 Strictly secure. No spam. You can unsubscribe in 1 click at any time.
          </p>
        </div>
      </section>

      {/* ==================== FINAL CTA BANNER ==================== */}
      <section className="max-w-3xl mx-auto px-6 py-12" id="buy">
        <div className="bg-charcoal text-white rounded-3xl p-8 md:p-12 text-center relative overflow-hidden border border-gold-500/30 shadow-2xl">
          {/* Subtle gold gradient radial blur */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gold-500/10 rounded-full blur-[120px] pointer-events-none"></div>
          
          <span className="text-[10px] text-gold-500 tracking-widest font-bold uppercase block mb-2">
            Limited Launch Event
          </span>
          <h2 className="font-serif text-3xl md:text-4.5xl font-bold text-white mb-4">
            Ready to Reset Your Glucose?
          </h2>
          <p className="text-white/75 text-sm md:text-base max-w-lg mx-auto mb-8">
            Secure the complete 38-page system handbook along with all 20 metabolic recipes, 30-day success tracker, and dining hacks today.
          </p>

          <div className="text-4xl md:text-5xl font-extrabold text-gold-500 tracking-tight mb-2">$17</div>
          <p className="text-xs text-white/55 mb-8">Ordinary list price: $47 — You instantly save $30</p>

          <a 
            href="https://innohubresources.com/funnel-evergreen-checkout-12/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-600 text-white font-bold text-lg px-12 py-5 rounded-full transition-all duration-300 transform hover:-translate-y-1 shadow-[0_8px_32px_rgba(184,134,61,0.3)] hover:shadow-[0_12px_40px_rgba(184,134,61,0.55)] cursor-pointer mb-6"
          >
            <span>🔥 Get Instant Access – $17</span>
            <ArrowRight className="w-5 h-5" />
          </a>

          {/* Secure details */}
          <div className="flex justify-center gap-6 text-[10px] text-white/50 flex-wrap mb-6">
            <span>📖 Instant PDF Download</span>
            <span>💳 256-bit Secure Checkout</span>
            <span>🔄 60-Day Refund Guarantee</span>
          </div>

          {/* Telegram Bonus */}
          <div className="bg-gold-500/10 border border-gold-500/30 rounded-2xl p-5 max-w-xl mx-auto text-left">
            <p className="text-xs font-semibold text-gold-500 uppercase tracking-widest mb-1">🎁 Premium Purchaser Bonus:</p>
            <p className="text-xs text-white/90 leading-relaxed">
              Included free: Gain direct access to Alenna's private Telegram circle, <strong>@TheLeanLifeClub</strong>, for weekly live Q&As, community coaching, and direct answers to your metabolic questions.
            </p>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-gold-100 py-12 px-6 text-center text-xs text-muted">
        <div className="max-w-4xl mx-auto">
          <p className="font-serif font-bold text-charcoal mb-2">The Glucose Reset &copy; 2026</p>
          <p className="mb-4">Designed with precise attention to metabolic health &amp; user privacy.</p>
          
          <div className="flex justify-center gap-4 mb-6">
            <a href="#" className="hover:text-gold-500 transition duration-200">Privacy Policy</a>
            <span>•</span>
            <a href="#" className="hover:text-gold-500 transition duration-200">Terms of Use</a>
            <span>•</span>
            <a href="#" className="hover:text-gold-500 transition duration-200">Contact Support</a>
          </div>

          <p className="max-w-xl mx-auto text-[10px] text-muted/60 leading-relaxed">
            *Disclaimer: The statements on this page have not been evaluated by the FDA. This guide is for educational purposes only and does not substitute for professional medical diagnosis or treatment plans.
          </p>
        </div>
      </footer>

      {/* ==================== BREVO-CONNECTED EXIT-INTENT POPUP MODAL ==================== */}
      <AnimatePresence>
        {isPopupOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              // Close if click is strictly on background overlay
              if (e.target === e.currentTarget) setIsPopupOpen(false);
            }}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-6 md:p-10 max-w-lg w-full shadow-2xl relative border border-gold-200"
            >
              {/* Close Button */}
              <button 
                onClick={() => setIsPopupOpen(false)}
                className="absolute top-4 right-4 bg-gold-50 text-charcoal hover:bg-gold-100 rounded-full p-1.5 transition-colors duration-200 cursor-pointer"
                aria-label="Close popup"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header inside popup */}
              <div className="text-center mb-6">
                <span className="bg-gold-100 text-gold-500 text-[9px] uppercase tracking-widest font-extrabold px-3 py-1 rounded-full mb-3 inline-block">
                  🌸 WAIT! Don't Leave Empty Handed
                </span>
                <h3 className="font-serif text-2xl font-bold text-charcoal leading-tight">
                  Get the <span className="text-gold-500">7-Day Glucose</span> Flattening Cheatsheet — FREE
                </h3>
                <p className="text-xs text-muted mt-2">
                  3 simple science hacks to shut down intense cravings and trigger natural morning energy.
                </p>
              </div>

              {/* Value checks */}
              <div className="bg-gold-50 rounded-2xl p-4 mb-6 border border-gold-100/70">
                <ul className="space-y-2.5 text-xs text-charcoal/90">
                  <li className="flex gap-2.5 items-center">
                    <Check className="w-4 h-4 text-gold-500 stroke-[3]" />
                    <span>The Food Order rule (slash spikes up to 40%)</span>
                  </li>
                  <li className="flex gap-2.5 items-center">
                    <Check className="w-4 h-4 text-gold-500 stroke-[3]" />
                    <span>3 Quick Breakfast replacements</span>
                  </li>
                  <li className="flex gap-2.5 items-center">
                    <Check className="w-4 h-4 text-gold-500 stroke-[3]" />
                    <span>The Apple Cider vinegar stabilizer</span>
                  </li>
                </ul>
              </div>

              {/* Form or feedback */}
              <AnimatePresence mode="wait">
                {!exitResult ? (
                  <form 
                    onSubmit={(e) => handleFormSubmit(e, exitEmail, "exit-popup", setExitLoading, setExitResult, () => setExitEmail(""))}
                    className="space-y-3"
                  >
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted w-4 h-4" />
                      <input 
                        type="email" 
                        value={exitEmail}
                        onChange={(e) => setExitEmail(e.target.value)}
                        placeholder="Enter your personal email..." 
                        className="w-full pl-11 pr-4 py-4 rounded-full border border-gold-200 bg-white text-sm focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all text-charcoal"
                        required
                        autoFocus
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={exitLoading}
                      className="w-full bg-gold-500 hover:bg-gold-600 text-white font-bold text-base py-4 rounded-full transition-all duration-200 shadow-lg shadow-gold-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {exitLoading ? "Sending Details..." : "📩 Send Me The Cheatsheet"}
                    </button>
                  </form>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`rounded-2xl p-5 text-center ${exitResult.success ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'}`}
                  >
                    <div className="flex justify-center mb-2">
                      {exitResult.success ? (
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-8 h-8 text-rose-500" />
                      )}
                    </div>
                    <h4 className="font-bold text-sm">{exitResult.success ? "Success!" : "Subscription Failed"}</h4>
                    <p className="text-xs mt-1">{exitResult.message || exitResult.error}</p>
                    {exitResult.success && exitResult.simulated && (
                      <p className="text-[10px] text-amber-700 font-mono mt-3 bg-amber-50 rounded-lg p-2 border border-amber-200">
                        💡 Demo status active. Copy and add your <strong>BREVO_API_KEY</strong> to secrets to link this directly to your Brevo campaign.
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="text-center mt-4 flex flex-col items-center gap-1">
                <p className="text-[10px] text-muted">
                  🔒 Your data remains strictly confidential. Instant PDF download delivery.
                </p>
                <button 
                  onClick={() => setIsPopupOpen(false)}
                  className="text-xs text-muted/60 underline hover:text-charcoal mt-2 cursor-pointer bg-transparent border-0"
                >
                  No thanks, I'll pass
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
