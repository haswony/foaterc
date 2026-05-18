export default function Developer() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center text-2xl md:text-3xl font-bold text-slate-700">
        تم تطويره بواسطة{' '}
        <span className="shimmer-text">محمد عادل هيا</span>
      </div>

      <style>{`
        .shimmer-text {
          background: linear-gradient(
            90deg,
            #1e293b 0%,
            #1e293b 35%,
            #facc15 45%,
            #f59e0b 50%,
            #facc15 55%,
            #1e293b 65%,
            #1e293b 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: shimmer 3s linear infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
    </div>
  );
}
