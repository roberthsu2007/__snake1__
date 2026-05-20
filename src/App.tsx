import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, RotateCcw, Activity } from "lucide-react";
import { Point, Direction, GameStatus } from "./types";
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  GRID_SIZE, 
  INITIAL_SNAKE, 
  INITIAL_DIRECTION, 
  GAME_SPEED 
} from "./constants";

export default function App() {
  // Game State
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("snakeHighScore");
    return saved ? parseInt(saved, 10) : 0;
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const directionRef = useRef<Direction>(INITIAL_DIRECTION);
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const formatScore = (num: number) => num.toString().padStart(5, '0');

  // Helper: Generate random food position
  const generateFood = useCallback((currentSnake: Point[]): Point => {
    const cols = CANVAS_WIDTH / GRID_SIZE;
    const rows = CANVAS_HEIGHT / GRID_SIZE;
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * cols),
        y: Math.floor(Math.random() * rows),
      };
      const onSnake = currentSnake.some(
        (segment) => segment.x === newFood.x && segment.y === newFood.y
      );
      if (!onSnake) break;
    }
    return newFood;
  }, []);

  // Initialize Score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("snakeHighScore", score.toString());
    }
  }, [score, highScore]);

  const startGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    directionRef.current = INITIAL_DIRECTION;
    setFood(generateFood(INITIAL_SNAKE));
    setScore(0);
    setStatus(GameStatus.PLAYING);
  };

  const togglePause = () => {
    if (status === GameStatus.PLAYING) setStatus(GameStatus.PAUSED);
    else if (status === GameStatus.PAUSED) setStatus(GameStatus.PLAYING);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const currentDir = directionRef.current;

      if ((key === "arrowup" || key === "w") && currentDir !== "DOWN") {
        setDirection("UP");
      } else if ((key === "arrowdown" || key === "s") && currentDir !== "UP") {
        setDirection("DOWN");
      } else if ((key === "arrowleft" || key === "a") && currentDir !== "RIGHT") {
        setDirection("LEFT");
      } else if ((key === "arrowright" || key === "d") && currentDir !== "LEFT") {
        setDirection("RIGHT");
      } else if (key === " ") {
        togglePause();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status]);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  const moveSnake = useCallback(() => {
    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const newHead = { ...head };

      switch (directionRef.current) {
        case "UP": newHead.y -= 1; break;
        case "DOWN": newHead.y += 1; break;
        case "LEFT": newHead.x -= 1; break;
        case "RIGHT": newHead.x += 1; break;
      }

      if (
        newHead.x < 0 || newHead.x >= CANVAS_WIDTH / GRID_SIZE || 
        newHead.y < 0 || newHead.y >= CANVAS_HEIGHT / GRID_SIZE ||
        prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)
      ) {
        setStatus(GameStatus.GAME_OVER);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 10);
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop();
      }
      return newSnake;
    });
  }, [food, generateFood]);

  useEffect(() => {
    if (status !== GameStatus.PLAYING) return;
    const loop = (time: number) => {
      const delta = time - lastTimeRef.current;
      if (delta > GAME_SPEED) {
        moveSnake();
        lastTimeRef.current = time;
      }
      gameLoopRef.current = requestAnimationFrame(loop);
    };
    gameLoopRef.current = requestAnimationFrame(loop);
    return () => { if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current); };
  }, [status, moveSnake]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#FAFAFA";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle Grid
    ctx.strokeStyle = "rgba(0, 0, 0, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
    }

    // Food
    ctx.fillStyle = "#CC0066";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#CC0066";
    ctx.beginPath();
    ctx.arc(food.x * GRID_SIZE + GRID_SIZE/2, food.y * GRID_SIZE + GRID_SIZE/2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Snake
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      ctx.fillStyle = isHead ? "#0066CC" : "#0066CC";
      ctx.shadowBlur = isHead ? 20 : 10;
      ctx.shadowColor = isHead ? "rgba(0, 102, 204, 0.5)" : "rgba(0, 102, 204, 0.3)";
      
      const p = isHead ? 0 : 1;
      ctx.fillRect(segment.x * GRID_SIZE + p, segment.y * GRID_SIZE + p, GRID_SIZE - p*2, GRID_SIZE - p*2);
      
      if (isHead) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(segment.x * GRID_SIZE + 4, segment.y * GRID_SIZE + 6, 3, 3);
        ctx.fillRect(segment.x * GRID_SIZE + 13, segment.y * GRID_SIZE + 6, 3, 3);
      }
      ctx.shadowBlur = 0;
    });
  }, [snake, food]);

  return (
    <div className="w-full h-screen bg-light-bg text-[#1A1A1A] font-sans flex flex-col overflow-hidden select-none">
      {/* Header */}
      <header className="h-16 border-b border-black/10 flex items-center justify-between px-8 bg-light-surface shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-[#0066CC] to-[#0044AA] rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-light-bg rounded-sm"></div>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-black uppercase">
            NEON_SNAKE <span className="text-[10px] bg-black/10 px-1.5 py-0.5 rounded text-black/40 align-top">v1.0.4</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-12">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-black/50 font-semibold">目前得分</span>
            <span className="text-2xl mono-stat text-neon-blue">{formatScore(score)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-black/50 font-semibold">最高紀錄</span>
            <span className="text-2xl mono-stat text-black/80">{formatScore(highScore)}</span>
          </div>
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-[10px] uppercase tracking-widest text-black/50 font-semibold">倍率</span>
            <span className="text-2xl mono-stat text-emerald-600">x{(1 + score/100).toFixed(1)}</span>
          </div>
        </div>
      </header>

      {/* Main Game Layout */}
      <main className="flex-1 flex p-6 gap-6 min-h-0">
        {/* Sidebar */}
        <aside className="w-48 flex flex-col gap-4 hidden md:flex">
          <div className="p-4 rounded-xl bg-black/5 border border-black/10">
            <h3 className="text-[11px] uppercase tracking-wider text-black/50 mb-3">操作說明</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-start-2 w-8 h-8 rounded border border-black/20 flex items-center justify-center text-xs opacity-50 uppercase">{direction === 'UP' ? 'W' : ''}</div>
              <div className="col-start-1 w-8 h-8 rounded border border-neon-blue bg-neon-blue/10 flex items-center justify-center text-xs text-neon-blue font-bold uppercase transition-all">A</div>
              <div className="w-8 h-8 rounded border border-black/20 flex items-center justify-center text-xs opacity-50 uppercase">S</div>
              <div className="w-8 h-8 rounded border border-black/20 flex items-center justify-center text-xs opacity-50 uppercase">D</div>
            </div>
            <p className="mt-4 text-[10px] text-black/40 leading-relaxed uppercase tracking-tighter">
              請使用方向鍵或 WASD。吃掉 <span className="text-neon-pink font-bold">霓虹脈衝</span> 來成長。
            </p>
          </div>

          <div className="p-4 rounded-xl bg-black/5 border border-black/10 flex-1 flex flex-col">
            <h3 className="text-[11px] uppercase tracking-wider text-black/50 mb-3">數據統計</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[11px] mb-1"><span className="text-black/40">速度</span><span className="mono-stat">{GAME_SPEED}ms</span></div>
                <div className="h-1 bg-black/10 rounded-full overflow-hidden">
                  <div className="h-full bg-neon-blue w-[75%]"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1"><span className="text-black/40">長度</span><span className="mono-stat">{snake.length} 單位</span></div>
                <div className="h-1 bg-black/10 rounded-full overflow-hidden">
                  <div className="h-full bg-black/30" style={{ width: `${Math.min(100, snake.length * 5)}%` }}></div>
                </div>
              </div>
            </div>
            
            <div className="mt-auto">
              <div className="p-3 bg-emerald-500/10 border border-emerald-600/30 rounded-lg text-[10px] text-emerald-700 flex items-center gap-2 uppercase tracking-tight">
                <Activity size={12} className="animate-pulse" /> 核心穩定: 60FPS
              </div>
            </div>
          </div>
        </aside>

        {/* Canvas Area */}
        <div className="flex-1 relative bg-game-bg rounded-2xl border border-black/10 overflow-hidden shadow-sm flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="max-w-full max-h-full"
          />

          {/* Overlays */}
          <AnimatePresence>
            {status === GameStatus.IDLE && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-light-bg/80 backdrop-blur-md flex items-center justify-center p-8 text-center"
              >
                <div>
                  <h2 className="text-7xl font-bold tracking-tighter text-black mb-8">準備開始</h2>
                  <button
                    onClick={startGame}
                    className="px-12 py-4 bg-neon-blue text-white font-bold rounded-lg uppercase tracking-[0.2em] text-sm hover:bg-blue-600 hover:scale-105 transition-all active:scale-95 shadow-[0_0_30px_rgba(0,102,204,0.3)]"
                  >
                    開始遊戲
                  </button>
                </div>
              </motion.div>
            )}

            {status === GameStatus.PAUSED && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-light-bg/40 backdrop-blur-sm flex items-center justify-center"
              >
                <div className="text-center">
                  <h3 className="text-4xl font-bold text-black tracking-[0.3em] mb-6">暫停</h3>
                  <button
                    onClick={togglePause}
                    className="px-8 py-2 border border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-white transition-all rounded-lg font-bold uppercase text-xs tracking-widest"
                  >
                    繼續
                  </button>
                </div>
              </motion.div>
            )}

            {status === GameStatus.GAME_OVER && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-light-bg/90 backdrop-blur-xl flex items-center justify-center"
              >
                <div className="text-center">
                  <h2 className="text-[100px] font-bold tracking-tighter leading-none mb-2 text-black italic">遊戲結束</h2>
                  <p className="text-neon-pink mono-stat tracking-[0.3em] uppercase mb-12 text-xl">最終得分: {formatScore(score)}</p>
                  <button
                    onClick={startGame}
                    className="px-10 py-4 bg-neon-blue text-white font-bold rounded-lg uppercase tracking-widest text-sm hover:bg-blue-600 transition-all shadow-[0_0_40px_rgba(0,102,204,0.4)]"
                  >
                    重啟模擬
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-10 bg-light-surface border-t border-black/10 shrink-0 flex items-center justify-between px-8 text-[10px] text-black/40 uppercase tracking-widest shadow-sm">
        <div className="flex gap-6">
          <span>Vite React TS</span>
          <span>Tailwind 4.0</span>
          <span>Motion 12.0</span>
        </div>
        <div className="flex gap-6">
          <span className="text-emerald-500 flex items-center gap-1">
            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" /> 狀態: 系統就緒
          </span>
        </div>
      </footer>
    </div>
  );
}
