import { useEffect, useState } from 'react';
import { Sparkles, FileText, Shield, Scale, Search } from 'lucide-react';

const analysisSteps = [
  { icon: FileText, label: 'Extracting contract text' },
  { icon: Search, label: 'Identifying key terms' },
  { icon: Scale, label: 'Analyzing fairness' },
  { icon: Shield, label: 'Detecting risk factors' },
];

export function AnalyzingState() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Cycle through steps
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % analysisSteps.length);
    }, 3000);

    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 3;
      });
    }, 500);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, []);

  const CurrentIcon = analysisSteps[currentStep].icon;

  return (
    <div
      className="rounded-[20px] p-10 text-center"
      style={{ background: 'rgba(255, 255, 255, 0.6)' }}
    >
      {/* Animated Icon Container */}
      <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6">
        {/* Pulsing rings */}
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{
            background: 'rgba(102, 0, 51, 0.15)',
            animationDuration: '2s',
          }}
        />
        <div
          className="absolute inset-2 rounded-full animate-ping"
          style={{
            background: 'rgba(102, 0, 51, 0.1)',
            animationDuration: '2s',
            animationDelay: '0.5s',
          }}
        />

        {/* Main icon container */}
        <div
          className="relative w-16 h-16 rounded-xl flex items-center justify-center z-10"
          style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
        >
          <Sparkles className="h-8 w-8 text-[#F7E6CA] animate-pulse" />
        </div>
      </div>

      <h3 className="text-xl font-bold text-[#660033] mb-2">
        Analyzing Your Contract
      </h3>

      <p className="text-[rgba(102,0,51,0.6)] text-sm max-w-md mx-auto mb-6">
        Our AI is reviewing your contract to provide a plain-language summary,
        identify key terms, and flag potential concerns.
      </p>

      {/* Progress Bar */}
      <div className="max-w-xs mx-auto mb-6">
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: 'rgba(102, 0, 51, 0.1)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #660033 0%, #8B0045 100%)',
            }}
          />
        </div>
      </div>

      {/* Analysis Steps */}
      <div className="flex justify-center gap-3 mb-6">
        {analysisSteps.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = currentStep === index;
          const isPast = index < currentStep;

          return (
            <div
              key={index}
              className="flex flex-col items-center transition-all duration-500"
              style={{
                opacity: isActive ? 1 : isPast ? 0.7 : 0.4,
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-500"
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, #660033 0%, #8B0045 100%)'
                    : isPast
                    ? 'rgba(102, 0, 51, 0.2)'
                    : 'rgba(102, 0, 51, 0.08)',
                }}
              >
                <StepIcon
                  className="h-4 w-4 transition-colors duration-500"
                  style={{ color: isActive ? '#F7E6CA' : isPast ? '#660033' : 'rgba(102, 0, 51, 0.4)' }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Current Step Label */}
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-500"
        style={{ background: 'rgba(102, 0, 51, 0.08)' }}
      >
        <CurrentIcon className="h-3.5 w-3.5 text-[#660033] animate-pulse" />
        <span className="text-xs font-medium text-[#660033]">
          {analysisSteps[currentStep].label}
        </span>
      </div>

      {/* Estimated Time */}
      <p className="text-xs text-[rgba(102,0,51,0.5)] mt-4">
        This usually takes 30-45 seconds
      </p>

      <style>{`
        @keyframes ping {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          75%, 100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        .animate-ping {
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}
