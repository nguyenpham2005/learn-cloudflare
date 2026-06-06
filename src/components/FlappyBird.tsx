'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Bird {
  y: number;
  velocity: number;
}

interface Pipe {
  x: number;
  gapY: number;
}

export default function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  const birdRef = useRef<Bird>({ y: 300, velocity: 0 });
  const pipesRef = useRef<Pipe[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const lastPipeRef = useRef<number>(0);
  const autoPlayRef = useRef<number | undefined>(undefined);
  const cloudsRef = useRef<{ x: number; y: number; size: number; speed: number }[]>([
    { x: 100, y: 80, size: 40, speed: 0.5 },
    { x: 300, y: 120, size: 50, speed: 0.3 },
    { x: 500, y: 60, size: 35, speed: 0.7 },
  ]);

  const GRAVITY = 0.5;
  const JUMP_FORCE = -8;
  const PIPE_SPEED = 3;
  const PIPE_GAP = 150;
  const PIPE_WIDTH = 60;
  const PIPE_SPAWN_RATE = 1500;
  const BIRD_SIZE = 30;

  const jump = useCallback(() => {
    if (!gameStarted || gameOver) return;
    birdRef.current.velocity = JUMP_FORCE;
    setAutoPlay(false);
  }, [gameStarted, gameOver]);

  const resetGame = useCallback(() => {
    birdRef.current = { y: 300, velocity: 0 };
    pipesRef.current = [];
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    setAutoPlay(true);
    lastPipeRef.current = 0;
  }, []);

  const startGame = useCallback(() => {
    setGameStarted(true);
    setAutoPlay(true);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!gameStarted) {
          startGame();
        } else if (gameOver) {
          resetGame();
        } else {
          jump();
        }
      }
    };

    const handleCanvasClick = () => {
      if (!gameStarted) {
        startGame();
      } else if (gameOver) {
        resetGame();
      } else {
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('click', handleCanvasClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [gameStarted, gameOver, jump, resetGame, startGame]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (timestamp: number) => {
      // Draw gradient sky
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#87CEEB');
      gradient.addColorStop(0.6, '#98D8E8');
      gradient.addColorStop(1, '#B0E0E6');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw clouds
      cloudsRef.current.forEach(cloud => {
        cloud.x -= cloud.speed;
        if (cloud.x < -cloud.size * 2) {
          cloud.x = canvas.width + cloud.size;
        }
        drawCloud(ctx, cloud.x, cloud.y, cloud.size);
      });

      // Auto-play logic
      if (autoPlay && !gameOver) {
        const nextPipe = pipesRef.current.find(pipe => pipe.x > 30 && pipe.x < 150);
        if (nextPipe) {
          const targetY = nextPipe.gapY + PIPE_GAP / 2 - BIRD_SIZE / 2;
          if (birdRef.current.y > targetY + 20) {
            birdRef.current.velocity = JUMP_FORCE;
          }
        } else if (birdRef.current.y > canvas.height - 150) {
          birdRef.current.velocity = JUMP_FORCE;
        }
      }

      // Update bird
      birdRef.current.velocity += GRAVITY;
      birdRef.current.y += birdRef.current.velocity;

      // Draw bird with better design
      drawBird(ctx, 50, birdRef.current.y, BIRD_SIZE);

      // Spawn pipes
      if (timestamp - lastPipeRef.current > PIPE_SPAWN_RATE) {
        const gapY = Math.random() * (canvas.height - PIPE_GAP - 100) + 50;
        pipesRef.current.push({ x: canvas.width, gapY });
        lastPipeRef.current = timestamp;
      }

      // Update and draw pipes
      pipesRef.current = pipesRef.current.filter(pipe => {
        pipe.x -= PIPE_SPEED;

        // Draw top pipe with details
        drawPipe(ctx, pipe.x, 0, PIPE_WIDTH, pipe.gapY, true);

        // Draw bottom pipe with details
        drawPipe(ctx, pipe.x, pipe.gapY + PIPE_GAP, PIPE_WIDTH, canvas.height - pipe.gapY - PIPE_GAP, false);

        // Check collision
        const birdRight = 50 + BIRD_SIZE;
        const birdBottom = birdRef.current.y + BIRD_SIZE;

        if (birdRight > pipe.x && 50 < pipe.x + PIPE_WIDTH) {
          if (birdRef.current.y < pipe.gapY || birdBottom > pipe.gapY + PIPE_GAP) {
            setGameOver(true);
            setHighScore(prev => Math.max(prev, score));
            return false;
          }
        }

        // Score
        if (pipe.x + PIPE_WIDTH < 50 && !pipe.x.toString().includes('scored')) {
          setScore(prev => prev + 1);
          pipe.x = -1000; // Mark as scored
        }

        return pipe.x > -PIPE_WIDTH;
      });

      // Draw ground
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
      ctx.fillStyle = '#228B22';
      ctx.fillRect(0, canvas.height - 25, canvas.width, 8);

      // Check ground/ceiling collision
      if (birdRef.current.y < 0 || birdRef.current.y + BIRD_SIZE > canvas.height - 25) {
        setGameOver(true);
        setHighScore(prev => Math.max(prev, score));
        return;
      }

      // Draw score with better styling
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.font = 'bold 36px Arial';
      ctx.strokeText(`Score: ${score}`, 10, 45);
      ctx.fillText(`Score: ${score}`, 10, 45);
      ctx.font = 'bold 24px Arial';
      ctx.strokeText(`Best: ${highScore}`, 10, 80);
      ctx.fillText(`Best: ${highScore}`, 10, 80);

      // Draw auto-play indicator
      if (autoPlay) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('🤖 AUTO-PLAY', canvas.width - 140, 30);
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameStarted, gameOver, score, highScore]);

  // Draw initial state
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw gradient sky
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.6, '#98D8E8');
    gradient.addColorStop(1, '#B0E0E6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw clouds
    cloudsRef.current.forEach(cloud => {
      drawCloud(ctx, cloud.x, cloud.y, cloud.size);
    });

    // Draw ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, canvas.height - 25, canvas.width, 8);

    if (!gameStarted) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.strokeText('🐦 Flappy Bird', canvas.width / 2, canvas.height / 2 - 50);
      ctx.fillText('🐦 Flappy Bird', canvas.width / 2, canvas.height / 2 - 50);
      ctx.font = '20px Arial';
      ctx.strokeText('Click or Press Space to Start', canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillText('Click or Press Space to Start', canvas.width / 2, canvas.height / 2 + 20);
      ctx.font = '16px Arial';
      ctx.fillStyle = '#FFD700';
      ctx.fillText('🤖 Auto-play enabled', canvas.width / 2, canvas.height / 2 + 60);
      ctx.textAlign = 'left';
    } else if (gameOver) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.strokeText('Game Over!', canvas.width / 2, canvas.height / 2 - 50);
      ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 50);
      ctx.font = '28px Arial';
      ctx.strokeText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
      ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
      ctx.strokeText(`Best: ${highScore}`, canvas.width / 2, canvas.height / 2 + 50);
      ctx.fillText(`Best: ${highScore}`, canvas.width / 2, canvas.height / 2 + 50);
      ctx.font = '20px Arial';
      ctx.strokeText('Click or Press Space to Restart', canvas.width / 2, canvas.height / 2 + 100);
      ctx.fillText('Click or Press Space to Restart', canvas.width / 2, canvas.height / 2 + 100);
      ctx.textAlign = 'left';
    }
  }, [gameStarted, gameOver, score, highScore]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">🐦 Flappy Bird</h1>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={600}
          className="border-4 border-yellow-400 rounded-xl shadow-2xl cursor-pointer hover:border-yellow-300 transition-colors"
        />
        {autoPlay && gameStarted && !gameOver && (
          <div className="absolute top-2 right-2 bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold animate-pulse">
            🤖 AUTO-PLAY
          </div>
        )}
      </div>
      <div className="mt-6 text-center space-y-2">
        <p className="text-white text-lg font-semibold drop-shadow">
          Click hoặc nhấn Space để nhảy
        </p>
        <p className="text-yellow-300 text-sm">
          💡 Auto-play đang chạy - Nhấn bất kỳ để điều khiển thủ công
        </p>
      </div>
    </div>
  );
}

// Helper function to draw bird
function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  // Body
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.ellipse(x + size / 2, y + size / 2, size / 2, size / 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FFA500';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Wing
  ctx.fillStyle = '#FFA500';
  ctx.beginPath();
  ctx.ellipse(x + size / 2, y + size / 2 + 5, size / 4, size / 6, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(x + size * 0.7, y + size * 0.35, size / 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(x + size * 0.75, y + size * 0.35, size / 10, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = '#FF6B35';
  ctx.beginPath();
  ctx.moveTo(x + size * 0.85, y + size * 0.45);
  ctx.lineTo(x + size, y + size * 0.5);
  ctx.lineTo(x + size * 0.85, y + size * 0.55);
  ctx.closePath();
  ctx.fill();
}

// Helper function to draw pipe
function drawPipe(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, isTop: boolean) {
  // Main pipe body
  const gradient = ctx.createLinearGradient(x, y, x + width, y);
  gradient.addColorStop(0, '#228B22');
  gradient.addColorStop(0.3, '#32CD32');
  gradient.addColorStop(0.7, '#32CD32');
  gradient.addColorStop(1, '#228B22');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);

  // Pipe border
  ctx.strokeStyle = '#1a6b1a';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, width, height);

  // Pipe cap
  const capHeight = 25;
  const capExtension = 8;
  const capY = isTop ? y + height - capHeight : y;
  
  ctx.fillStyle = gradient;
  ctx.fillRect(x - capExtension, capY, width + capExtension * 2, capHeight);
  ctx.strokeRect(x - capExtension, capY, width + capExtension * 2, capHeight);

  // Highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(x + 5, y, 8, height);
}

// Helper function to draw cloud
function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
  ctx.arc(x + size * 0.4, y - size * 0.2, size * 0.6, 0, Math.PI * 2);
  ctx.arc(x + size * 0.8, y, size * 0.5, 0, Math.PI * 2);
  ctx.arc(x + size * 0.4, y + size * 0.2, size * 0.4, 0, Math.PI * 2);
  ctx.fill();
}
