import GrainOverlay from '../GrainOverlay';

export default function GrainOverlayExample() {
  return (
    <div className="relative w-full h-[200px] bg-[#F7E6CA] rounded-xl">
      <GrainOverlay />
      <div className="relative z-10 flex items-center justify-center h-full text-[#660033] text-lg font-medium">
        Grain texture overlay (subtle)
      </div>
    </div>
  );
}
