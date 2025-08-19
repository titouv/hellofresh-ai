import { useTimerContext } from "@/contexts/timer-context";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function TimerDisplay() {
  const { activeTimer, stopTimer, clearTimer } = useTimerContext();

  if (!activeTimer) {
    return null;
  }

  const isFinished = activeTimer.remainingTime === 0;

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border-2 ${
      isFinished 
        ? 'bg-red-50 border-red-300 animate-pulse' 
        : 'bg-blue-50 border-blue-300'
    }`}>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center">
          <div className={`text-2xl font-mono font-bold ${
            isFinished ? 'text-red-600' : 'text-blue-600'
          }`}>
            {formatTime(activeTimer.remainingTime)}
          </div>
          <div className="text-xs text-gray-500">
            {isFinished ? 'Timer finished!' : 'Timer running'}
          </div>
        </div>
        
        <div className="flex flex-col gap-1">
          {!isFinished && (
            <button
              onClick={() => stopTimer(activeTimer.id)}
              className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Stop
            </button>
          )}
          <button
            onClick={() => clearTimer(activeTimer.id)}
            className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
      </div>
      
      {!isFinished && (
        <div className="mt-2 bg-gray-200 rounded-full h-1.5">
          <div 
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000"
            style={{ 
              width: `${((activeTimer.duration - activeTimer.remainingTime) / activeTimer.duration) * 100}%` 
            }}
          />
        </div>
      )}
    </div>
  );
}