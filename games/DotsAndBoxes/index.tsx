
import React, { useEffect, useState, useRef } from 'react';
import { usePeer } from '../../hooks/usePeer';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import { Button, Card, Input, Badge } from '../../components/ui/GenericUI';
import { FriendSystemModal } from '../../components/ui/FriendSystem';
import { DotsGameState, Player, DotsShape, DotsGridType } from '../../types';
import { Copy, Users, ArrowRight, Grid3x3, Trophy, Play, Check, X, AlertTriangle, Settings, Loader2, Square, Diamond, Plus, Circle, Clock, Triangle, Shuffle, Hourglass, Home, UserPlus } from 'lucide-react';
import confetti from 'canvas-confetti';

// Helper to generate distinct colors for unlimited players
const getPlayerColor = (index: number) => {
    const hue = (index * 137.5) % 360; // Golden angle approx for distribution
    return {
        bg: `hsla(${hue}, 70%, 50%, 1)`,
        text: `hsla(${hue}, 90%, 15%, 1)`,
        border: `hsla(${hue}, 80%, 40%, 1)`,
        shadow: `0 4px 14px 0 hsla(${hue}, 70%, 50%, 0.5)`
    };
};

const DotsAndBoxesGame = ({ onExit, autoJoinCode }: { onExit: () => void, autoJoinCode?: string }) => {
  const { t, lang } = useLanguage();
  const { user, addScore } = useUser();
  const [playerName, setPlayerName] = useState(user?.name || '');
  const [hasJoined, setHasJoined] = useState(false);
  
  // UI States
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinGameCode, setJoinGameCode] = useState(autoJoinCode || '');
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(0);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Game Logic State
  const [gameState, setGameState] = useState<DotsGameState>({
    status: 'LOBBY',
    players: [],
    currentPlayerIndex: 0,
    config: {
        gridSize: 5,
        shape: 'SQUARE',
        gridType: 'SQUARE',
        turnTimeLimit: 0,
    },
    linesH: [],
    linesV: [],
    linesD: [],
    boxes: [],
    triangles: [],
    activeBoxes: [],
    winnerId: null,
    lastInteraction: 0
  });

  const timerRef = useRef<any>(null);

  // PeerJS Hook
  const { 
    displayCode,
    peerId, 
    isHost, 
    createGame,
    joinGame,
    broadcast, 
    sendToHost,
    sendTo,
    setMessageHandler, 
    connectionStatus,
    errorMsg
  } = usePeer();

  // Auto-Join
  useEffect(() => {
    if (autoJoinCode && !hasJoined && connectionStatus === 'IDLE' && playerName) {
        joinGame(playerName, autoJoinCode);
    }
  }, [autoJoinCode, hasJoined, connectionStatus, playerName]);

  // --------------------------------------------------------------------------
  // BOARD UTILITIES
  // --------------------------------------------------------------------------

  const isBoxValid = (r: number, c: number, size: number, shape: DotsShape): boolean => {
      const center = (size - 1) / 2; // Center of boxes
      const boxesPerRow = size - 1;
      
      // Basic bounds
      if (r < 0 || r >= boxesPerRow || c < 0 || c >= boxesPerRow) return false;

      // Shape Logic
      switch(shape) {
          case 'SQUARE':
              return true;
          case 'DIAMOND':
              // Manhattan distance from center
              // Normalize coords to center
              const dr = Math.abs(r - center + 0.5); // +0.5 because even/odd grids shift center
              const dc = Math.abs(c - center + 0.5);
              return (dr + dc) < (size / 1.4); // 1.4 is heuristic factor for diamond size
          case 'CROSS':
              const width = Math.max(1, Math.floor(size / 3));
              const crossDr = Math.abs(r - center + 0.5);
              const crossDc = Math.abs(c - center + 0.5);
              return crossDr < width || crossDc < width;
          case 'DONUT':
               const holeRadius = Math.max(1, Math.floor(size / 4));
               const donutDr = Math.abs(r - center + 0.5);
               const donutDc = Math.abs(c - center + 0.5);
               return Math.max(donutDr, donutDc) >= holeRadius;
          case 'HOURGLASS':
              const hgDr = Math.abs(r - center + 0.5);
              const hgDc = Math.abs(c - center + 0.5);
              // Simple hourglass: keep if row index is near top/bottom OR col index is near center
              // Or better: Diagonals. 
              return hgDc <= hgDr + 1; // Basic X shape approximation logic
          case 'RANDOM':
               // This logic runs every time, so random needs to be deterministic based on coords for consistency
               // or we generate activeBoxes once.
               // Since this function is used in `initializeBoard`, we can use Math.random() there.
               // Here we just return true and let initializeBoard handle randomness for this type.
               return true;
          default:
              return true;
      }
  };

  const initializeBoard = (size: number, shape: DotsShape, gridType: DotsGridType) => {
      // Arrays are initialized to Maximum size (Square), but we use activeBoxes to mask
      const boxesPerRow = size - 1;
      
      // Active Matrix
      const active = Array(boxesPerRow).fill(null).map((_, r) => 
        Array(boxesPerRow).fill(null).map((_, c) => {
            if (shape === 'RANDOM') return Math.random() > 0.4;
            return isBoxValid(r, c, size, shape);
        })
      );

      // Boxes Matrix (Square Mode)
      const b = Array(boxesPerRow).fill(null).map(() => Array(boxesPerRow).fill(null));
      
      // Triangles Matrix (Triangle Mode)
      const t = Array(boxesPerRow).fill(null).map(() => Array(boxesPerRow).fill({ top: null, bottom: null }));

      // Lines
      const h = Array(size).fill(null).map(() => Array(size - 1).fill(false));
      const v = Array(size - 1).fill(null).map(() => Array(size).fill(false));
      const d = Array(boxesPerRow).fill(null).map(() => Array(boxesPerRow).fill(false)); // For Diagonals

      return { linesH: h, linesV: v, linesD: d, boxes: b, triangles: t, activeBoxes: active };
  };

  // --------------------------------------------------------------------------
  // NETWORK HANDLING
  // --------------------------------------------------------------------------
  
  useEffect(() => {
    setMessageHandler((data, conn) => {
      // HOST LOGIC
      if (isHost) {
        if (data.type === 'JOIN') {
          const newPlayer: Player = { 
            id: data.payload.id, 
            name: data.payload.name, 
            isHost: false, 
            score: 0 
          };
          
          setGameState(prev => {
            if (prev.players.find(p => p.id === newPlayer.id)) {
                 if(conn) sendTo(conn, { type: 'UPDATE_STATE', payload: prev });
                 return prev;
            }

            const newState = {
              ...prev,
              players: [...prev.players, newPlayer]
            };
            
            if(conn) sendTo(conn, { type: 'UPDATE_STATE', payload: newState });
            broadcast({ type: 'UPDATE_STATE', payload: newState });
            return newState;
          });
        }
        else if (data.type === 'CLICK_LINE') {
            handleLineClick(data.payload.type, data.payload.r, data.payload.c, data.payload.playerId);
        }
      }
      
      // CLIENT LOGIC
      if (!isHost) {
        if (data.type === 'UPDATE_STATE') {
          setGameState(data.payload);
          // Scoring Hook
          const newState = data.payload as DotsGameState;
          if (newState.status === 'LEADERBOARD' && gameState.status !== 'LEADERBOARD') {
              const myData = newState.players.find(p => p.id === peerId);
              if (myData && myData.score > 0) {
                  addScore(myData.score);
              }
          }
        }
      }
    });
  }, [isHost, broadcast, gameState, sendTo, peerId]);

  // Handle connection success
  useEffect(() => {
    if (connectionStatus === 'CONNECTED' && !hasJoined) {
      setHasJoined(true);
      if (isHost) {
         setGameState(prev => {
             const { linesH, linesV, linesD, boxes, triangles, activeBoxes } = initializeBoard(prev.config.gridSize, prev.config.shape, prev.config.gridType);
             return {
                 ...prev,
                 linesH, linesV, linesD, boxes, triangles, activeBoxes,
                 players: [...prev.players, { id: peerId, name: playerName, isHost: true, score: 0 }]
             };
         });
      }
    }
  }, [connectionStatus, hasJoined, isHost, peerId, playerName]);


  // --------------------------------------------------------------------------
  // TIMER LOGIC
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (gameState.status === 'PLAYING' && gameState.config.turnTimeLimit > 0) {
        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = (now - gameState.lastInteraction) / 1000;
            const remaining = Math.max(0, gameState.config.turnTimeLimit - elapsed);
            setTurnTimeLeft(remaining);

            if (remaining <= 0 && isHost) {
                forceRandomMove();
            }
        }, 100);
        timerRef.current = interval;
        return () => clearInterval(interval);
    } else {
        if(timerRef.current) clearInterval(timerRef.current);
    }
  }, [gameState.status, gameState.lastInteraction, gameState.config.turnTimeLimit, isHost]);

  const forceRandomMove = () => {
     // Find all valid empty lines
     const validH: {r:number, c:number}[] = [];
     const validV: {r:number, c:number}[] = [];
     const validD: {r:number, c:number}[] = [];

     const isActiveBox = (r: number, c: number) => {
         if (r < 0 || c < 0 || r >= gameState.activeBoxes.length || c >= gameState.activeBoxes[0].length) return false;
         return gameState.activeBoxes[r][c];
     };

     gameState.linesH.forEach((row, r) => {
         row.forEach((drawn, c) => {
             if (!drawn && (isActiveBox(r, c) || isActiveBox(r-1, c))) validH.push({r,c});
         });
     });

     gameState.linesV.forEach((row, r) => {
        row.forEach((drawn, c) => {
            if (!drawn && (isActiveBox(r, c) || isActiveBox(r, c-1))) validV.push({r,c});
        });
    });
    
    if (gameState.config.gridType === 'TRIANGLE') {
        gameState.linesD.forEach((row, r) => {
            row.forEach((drawn, c) => {
                if (!drawn && isActiveBox(r, c)) validD.push({r,c});
            });
        });
    }

    const all = [
        ...validH.map(m=>({...m, type:'h'})), 
        ...validV.map(m=>({...m, type:'v'})),
        ...validD.map(m=>({...m, type:'d'}))
    ];
    
    if (all.length > 0) {
        const move = all[Math.floor(Math.random() * all.length)];
        handleLineClick(move.type as 'h'|'v'|'d', move.r, move.c, gameState.players[gameState.currentPlayerIndex].id);
    }
  };


  // --------------------------------------------------------------------------
  // GAME LOGIC (HOST ONLY)
  // --------------------------------------------------------------------------

  const backToLobby = () => {
      if (isHost) {
          setGameState(prev => {
              const newState: DotsGameState = {
                  ...prev,
                  status: 'LOBBY',
                  linesH: [], linesV: [], linesD: [], boxes: [], triangles: [], activeBoxes: [],
                  winnerId: null,
                  currentPlayerIndex: 0
                  // Keeping players and config
              };
              broadcast({ type: 'UPDATE_STATE', payload: newState });
              return newState;
          });
      } else {
          onExit();
      }
  };

  const startGame = () => {
    if (!isHost) return;
    const { linesH, linesV, linesD, boxes, triangles, activeBoxes } = initializeBoard(gameState.config.gridSize, gameState.config.shape, gameState.config.gridType);
    
    const newState: DotsGameState = {
        ...gameState,
        status: 'PLAYING',
        linesH, linesV, linesD, boxes, triangles, activeBoxes,
        currentPlayerIndex: 0,
        players: gameState.players.map(p => ({...p, score: 0})),
        winnerId: null,
        lastInteraction: Date.now()
    };
    setGameState(newState);
    broadcast({ type: 'UPDATE_STATE', payload: newState });
  };

  const handleLineClick = (type: 'h'|'v'|'d', r: number, c: number, playerId: string) => {
      // Only host processes logic
      if (!isHost) {
          sendToHost({ type: 'CLICK_LINE', payload: { type, r, c, playerId } });
          return;
      }

      // Validations
      if (gameState.status !== 'PLAYING') return;
      if (gameState.players[gameState.currentPlayerIndex].id !== playerId) return; 

      // Check if taken
      if (type === 'h' && gameState.linesH[r][c]) return;
      if (type === 'v' && gameState.linesV[r][c]) return;
      if (type === 'd' && gameState.linesD[r][c]) return;

      setGameState(prev => {
          // Clone state
          const newLinesH = prev.linesH.map(row => [...row]);
          const newLinesV = prev.linesV.map(row => [...row]);
          const newLinesD = prev.linesD.map(row => [...row]);
          const newBoxes = prev.boxes.map(row => [...row]);
          const newTriangles = prev.triangles.map(row => row.map(cell => ({...cell})));
          
          let newPlayers = prev.players.map(p => ({...p}));
          let scored = false;

          // Apply Move
          if (type === 'h') newLinesH[r][c] = true;
          else if (type === 'v') newLinesV[r][c] = true;
          else if (type === 'd') newLinesD[r][c] = true;

          // --- SQUARE MODE LOGIC ---
          if (prev.config.gridType === 'SQUARE') {
             const checkAndCaptureSquare = (br: number, bc: number) => {
                if (br < 0 || bc < 0 || br >= prev.activeBoxes.length || bc >= prev.activeBoxes[0].length) return false;
                if (!prev.activeBoxes[br][bc]) return false;
                if (newBoxes[br][bc]) return false;

                const top = newLinesH[br][bc];
                const bottom = newLinesH[br+1][bc];
                const left = newLinesV[br][bc];
                const right = newLinesV[br][bc+1];

                if (top && bottom && left && right) {
                    newBoxes[br][bc] = playerId;
                    return true;
                }
                return false;
             }
             if (type === 'h') {
                 if (checkAndCaptureSquare(r, c)) scored = true;
                 if (checkAndCaptureSquare(r-1, c)) scored = true;
             }
             if (type === 'v') {
                 if (checkAndCaptureSquare(r, c)) scored = true;
                 if (checkAndCaptureSquare(r, c-1)) scored = true;
             }
          }
          
          // --- TRIANGLE MODE LOGIC ---
          if (prev.config.gridType === 'TRIANGLE') {
              const checkAndCaptureTriangles = (br: number, bc: number) => {
                  if (br < 0 || bc < 0 || br >= prev.activeBoxes.length || bc >= prev.activeBoxes[0].length) return false;
                  if (!prev.activeBoxes[br][bc]) return false;
                  
                  let localScored = false;
                  const topH = newLinesH[br][bc];
                  const bottomH = newLinesH[br+1][bc];
                  const leftV = newLinesV[br][bc];
                  const rightV = newLinesV[br][bc+1];
                  const diag = newLinesD[br][bc];

                  // Check Top-Right Triangle (Top + Right + Diag)
                  if (!newTriangles[br][bc].top && topH && rightV && diag) {
                      newTriangles[br][bc].top = playerId;
                      localScored = true;
                  }
                  // Check Bottom-Left Triangle (Bottom + Left + Diag)
                  if (!newTriangles[br][bc].bottom && bottomH && leftV && diag) {
                      newTriangles[br][bc].bottom = playerId;
                      localScored = true;
                  }
                  return localScored;
              }

              // Check relevant boxes
              if (type === 'd') {
                  if (checkAndCaptureTriangles(r, c)) scored = true;
              }
              if (type === 'h') {
                  if (checkAndCaptureTriangles(r, c)) scored = true; // Box below
                  if (checkAndCaptureTriangles(r-1, c)) scored = true; // Box above
              }
              if (type === 'v') {
                  if (checkAndCaptureTriangles(r, c)) scored = true; // Box to right
                  if (checkAndCaptureTriangles(r, c-1)) scored = true; // Box to left
              }
          }

          if (scored) {
              const pIdx = newPlayers.findIndex(p => p.id === playerId);
              if (pIdx !== -1) {
                  let total = 0;
                  if (prev.config.gridType === 'SQUARE') {
                      newBoxes.forEach(row => row.forEach(b => { if(b === playerId) total++; }));
                  } else {
                      newTriangles.forEach(row => row.forEach(t => { 
                          if(t.top === playerId) total++;
                          if(t.bottom === playerId) total++;
                      }));
                  }
                  newPlayers[pIdx].score = total;
              }
          }

          let nextPlayerIndex = prev.currentPlayerIndex;
          if (!scored) {
              nextPlayerIndex = (prev.currentPlayerIndex + 1) % prev.players.length;
          }

          // Check Win Condition
          let isFinished = false;
          if (prev.config.gridType === 'SQUARE') {
             let totalActiveBoxes = 0;
             let totalCaptured = 0;
             prev.activeBoxes.forEach((row, r) => row.forEach((active, c) => {
                 if (active) {
                     totalActiveBoxes++;
                     if (newBoxes[r][c]) totalCaptured++;
                 }
             }));
             if (totalActiveBoxes > 0 && totalCaptured === totalActiveBoxes) isFinished = true;
          } else {
             // For Triangles, total active units is totalActiveBoxes * 2
             let totalActiveTris = 0;
             let totalCapturedTris = 0;
             prev.activeBoxes.forEach((row, r) => row.forEach((active, c) => {
                 if (active) {
                     totalActiveTris += 2;
                     if (newTriangles[r][c].top) totalCapturedTris++;
                     if (newTriangles[r][c].bottom) totalCapturedTris++;
                 }
             }));
             if (totalActiveTris > 0 && totalCapturedTris === totalActiveTris) isFinished = true;
          }
          
          let winnerId = null;
          let status = prev.status;

          if (isFinished) {
              status = 'LEADERBOARD';
              const maxScore = Math.max(...newPlayers.map(p => p.score));
              const winners = newPlayers.filter(p => p.score === maxScore);
              winnerId = winners[0].id; 
              
              // Host also updates their own score here since they calculated it
              if (winners.some(w => w.id === peerId)) {
                  addScore(winners.find(w => w.id === peerId)!.score); 
              }
          }

          const newState = {
              ...prev,
              linesH: newLinesH,
              linesV: newLinesV,
              linesD: newLinesD,
              boxes: newBoxes,
              triangles: newTriangles,
              players: newPlayers,
              currentPlayerIndex: nextPlayerIndex,
              status,
              winnerId,
              lastInteraction: Date.now() // Reset timer
          };

          broadcast({ type: 'UPDATE_STATE', payload: newState });
          return newState;
      });
  };

  // --------------------------------------------------------------------------
  // RENDER UI
  // --------------------------------------------------------------------------

  // 1. SETUP
  if (!hasJoined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 max-w-xl mx-auto w-full">
        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-8 pop-in drop-shadow-lg text-center leading-tight">
          {t('game.dots')}
        </h1>
        
        <Card className="w-full flex flex-col gap-6">
          <div>
            <label className="block text-white/50 mb-2 font-bold uppercase tracking-wider text-sm">{t('enterName')}</label>
            <Input 
              placeholder="e.g. Mastermind" 
              value={playerName} 
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={15}
            />
          </div>
          
          {!showJoinInput && !autoJoinCode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <Button 
                  variant="primary" 
                  size="lg"
                  disabled={!playerName}
                  onClick={() => createGame(playerName)}
                  className="w-full bg-cyan-600 border-cyan-800 hover:bg-cyan-500"
                >
                    {connectionStatus === 'CONNECTING' ? <Loader2 className="animate-spin w-6 h-6"/> : t('create')}
                </Button>
                <Button 
                  variant="glass"
                  size="lg"
                  disabled={!playerName}
                  onClick={() => setShowJoinInput(true)}
                  className="w-full"
                >
                  {t('join')}
                </Button>
              </div>
          ) : (
              <div className="flex flex-col gap-4 mt-2 animate-fade-in">
                <div>
                   <label className="block text-white/50 mb-2 font-bold uppercase tracking-wider text-sm">{t('enterGameId')}</label>
                   <Input 
                      placeholder="ABCD" 
                      value={joinGameCode}
                      onChange={(e) => setJoinGameCode(e.target.value.toUpperCase())}
                      maxLength={4}
                      className="tracking-[0.5em] font-mono uppercase text-3xl"
                    />
                </div>
                <div className="flex gap-3">
                    <Button 
                        className="flex-1 bg-pink-500 border-pink-700 hover:bg-pink-400"
                        size="lg"
                        disabled={connectionStatus === 'CONNECTING' || joinGameCode.length < 4}
                        onClick={() => joinGame(playerName, joinGameCode)}
                    >
                        {connectionStatus === 'CONNECTING' ? <Loader2 className="animate-spin w-6 h-6" /> : t('connect')}
                    </Button>
                    {autoJoinCode ? (
                        <Button variant="glass" size="lg" className="px-6" onClick={onExit}><X size={24}/></Button>
                    ) : (
                        <Button variant="glass" size="lg" className="px-6" onClick={() => setShowJoinInput(false)}><X size={24}/></Button>
                    )}
                </div>
              </div>
          )}
        </Card>
        <button onClick={onExit} className="mt-8 text-white/40 hover:text-white font-bold tracking-widest uppercase text-sm transition-colors py-4">← Back to Home</button>
      </div>
    );
  }

  // 2. LOBBY
  if (gameState.status === 'LOBBY') {
    return (
      <div className="flex flex-col items-center pt-8 md:pt-16 min-h-screen p-4 max-w-4xl mx-auto w-full">
         <div className="w-full flex justify-between mb-6">
            <Button variant="glass" size="sm" onClick={onExit}>
                <ArrowRight className="mr-2 rotate-180" size={20}/> Exit to Main Menu
            </Button>
            {isHost && (
                <Button variant="secondary" size="sm" onClick={() => setShowInviteModal(true)}>
                    <UserPlus className="mr-2" size={20}/> Invite Friends
                </Button>
            )}
         </div>

         <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-cyan-900/50 to-blue-900/50">
               <h2 className="text-xl text-white/50 font-bold uppercase tracking-widest mb-4">Room Code</h2>
               <div className="relative group cursor-pointer active:scale-95 transition-transform" onClick={() => { navigator.clipboard.writeText(displayCode || joinGameCode); alert(t('copied')); }}>
                   <span className="font-black text-7xl md:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 to-cyan-500 tracking-wider drop-shadow-2xl font-mono">{displayCode || joinGameCode}</span>
                   <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"><Copy size={24} className="text-cyan-400"/></div>
               </div>
            </Card>

            {isHost ? (
               <Card className="text-left bg-white/5">
                   <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                       <Settings className="text-cyan-400" size={28} /> 
                       <span className="text-2xl font-bold">{t('settings.title')}</span>
                   </div>
                   
                   <div className="space-y-6">
                       <div>
                           <div className="flex justify-between items-center mb-2">
                               <label className="text-sm font-bold text-white/60">{t('settings.gridSize')}</label>
                               <span className="text-cyan-400 font-black text-xl">{gameState.config.gridSize} x {gameState.config.gridSize}</span>
                           </div>
                           <input 
                              type="range" min="3" max="20" step="1"
                              value={gameState.config.gridSize}
                              onChange={(e) => {
                                  const newState = { ...gameState, config: { ...gameState.config, gridSize: parseInt(e.target.value) }};
                                  setGameState(newState);
                                  broadcast({ type: 'UPDATE_STATE', payload: newState });
                              }}
                              className="w-full h-3 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                           />
                       </div>

                       <div>
                           <label className="text-sm font-bold text-white/60 block mb-2">{t('settings.gridType')}</label>
                           <div className="flex gap-2 bg-black/20 p-2 rounded-xl">
                               {[
                                   { id: 'SQUARE', icon: Square, label: 'types.SQUARE' },
                                   { id: 'TRIANGLE', icon: Triangle, label: 'types.TRIANGLE' }
                               ].map(type => (
                                    <button
                                     key={type.id}
                                     className={`flex-1 flex flex-col items-center justify-center py-3 rounded-lg font-bold transition-all ${gameState.config.gridType === type.id ? 'bg-cyan-600 text-white shadow-lg' : 'text-white/40 hover:bg-white/5'}`}
                                     onClick={() => {
                                         const newState = { ...gameState, config: { ...gameState.config, gridType: type.id as DotsGridType }};
                                         setGameState(newState);
                                         broadcast({ type: 'UPDATE_STATE', payload: newState });
                                     }}
                                   >
                                       <type.icon size={20} className="mb-1" />
                                       <span className="text-xs uppercase">{t(type.label)}</span>
                                   </button>
                               ))}
                           </div>
                       </div>

                       <div>
                           <label className="text-sm font-bold text-white/60 block mb-2">{t('settings.shape')}</label>
                           <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                               {[
                                   { id: 'SQUARE', icon: Square, label: 'shapes.SQUARE' },
                                   { id: 'DIAMOND', icon: Diamond, label: 'shapes.DIAMOND' },
                                   { id: 'CROSS', icon: Plus, label: 'shapes.CROSS' },
                                   { id: 'DONUT', icon: Circle, label: 'shapes.DONUT' },
                                   { id: 'HOURGLASS', icon: Hourglass, label: 'shapes.HOURGLASS' },
                                   { id: 'RANDOM', icon: Shuffle, label: 'shapes.RANDOM' }
                               ].map((s) => (
                                   <button
                                     key={s.id}
                                     className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${gameState.config.shape === s.id ? 'bg-cyan-500 border-cyan-300 text-white shadow-lg scale-105' : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'}`}
                                     onClick={() => {
                                         const newState = { ...gameState, config: { ...gameState.config, shape: s.id as DotsShape }};
                                         setGameState(newState);
                                         broadcast({ type: 'UPDATE_STATE', payload: newState });
                                     }}
                                   >
                                       <s.icon size={20} className="mb-1" />
                                       <span className="text-[9px] uppercase font-bold truncate w-full text-center">{t(`settings.${s.label}`)}</span>
                                   </button>
                               ))}
                           </div>
                       </div>

                       <div>
                           <div className="flex justify-between items-center mb-2">
                               <label className="text-sm font-bold text-white/60">{t('settings.turnTimer')}</label>
                               <span className="text-orange-400 font-black text-xl">
                                   {gameState.config.turnTimeLimit === 0 ? t('settings.off') : `${gameState.config.turnTimeLimit}s`}
                               </span>
                           </div>
                           <input 
                              type="range" min="0" max="60" step="5"
                              value={gameState.config.turnTimeLimit}
                              onChange={(e) => {
                                  const newState = { ...gameState, config: { ...gameState.config, turnTimeLimit: parseInt(e.target.value) }};
                                  setGameState(newState);
                                  broadcast({ type: 'UPDATE_STATE', payload: newState });
                              }}
                              className="w-full h-3 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-400"
                           />
                       </div>
                   </div>
               </Card>
            ) : (
                <Card className="flex items-center justify-center bg-white/5">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center animate-spin-slow">
                             <Loader2 size={40} className="text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold">{t('waiting')}</h3>
                            <p className="text-white/40">Host is configuring the arena...</p>
                        </div>
                    </div>
                    <div className="mt-8 flex justify-center">
                         <Button variant="glass" size="sm" onClick={onExit} className="mt-4">Leave Game</Button>
                    </div>
                </Card>
            )}
         </div>

         <div className="w-full mb-10">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-white/50 uppercase text-sm font-bold tracking-widest flex items-center gap-2">
                    <Users size={16}/> {t('players')}
                </h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {gameState.players.map((p, idx) => {
                    const colors = getPlayerColor(idx);
                    return (
                        <div key={p.id} className="bg-white/10 rounded-2xl p-4 flex flex-col items-center pop-in border-2 border-white/5 relative overflow-hidden" style={{borderColor: colors.border}}>
                             {p.isHost && <div className="absolute top-0 right-0 bg-yellow-500 text-yellow-950 text-[10px] font-black px-2 py-1 rounded-bl-lg uppercase tracking-wider z-10">Host</div>}
                            <div className={`w-12 h-12 rounded-full mb-2 flex items-center justify-center font-black text-xl shadow-lg border-2`} style={{backgroundColor: colors.bg, color: colors.text, borderColor: colors.border}}>
                                {p.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold truncate w-full text-center text-sm">{p.name}</span>
                        </div>
                    );
                })}
            </div>
         </div>

         {isHost && (
           <div className="sticky bottom-6 w-full max-w-md mx-auto">
               <Button variant="success" size="xl" className="w-full shadow-emerald-900/50 animate-bounce-subtle bg-emerald-500 border-emerald-700 hover:bg-emerald-400" onClick={startGame}>
                 <Play fill="currentColor" size={28} /> {t('startGame')}
               </Button>
           </div>
         )}
         
         <FriendSystemModal 
            isOpen={showInviteModal} 
            onClose={() => setShowInviteModal(false)} 
            inviteMode={true} 
            currentGameInfo={{ type: 'dots', code: displayCode || joinGameCode }}
         />
      </div>
    );
  }

  // 3. PLAYING & LEADERBOARD
  if (gameState.status === 'PLAYING' || gameState.status === 'LEADERBOARD') {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      const isMyTurn = currentPlayer?.id === peerId && gameState.status === 'PLAYING';
      
      const totalGridRows = 2 * gameState.config.gridSize - 1;
      const totalGridCols = 2 * gameState.config.gridSize - 1;
      const isTriangleMode = gameState.config.gridType === 'TRIANGLE';

      const timerPercent = gameState.config.turnTimeLimit > 0 
           ? (turnTimeLeft / gameState.config.turnTimeLimit) * 100 
           : 100;

      return (
          <div className="flex flex-col min-h-screen p-4 md:p-8 max-w-5xl mx-auto w-full items-center">
              
               <div className="w-full flex justify-start mb-4">
                  <Button variant="glass" size="sm" onClick={backToLobby}>
                      <Home className="mr-2" size={18}/> {isHost ? "Lobby" : "Leave"}
                  </Button>
              </div>

              <div className="w-full overflow-x-auto pb-4 mb-4 bubble-scrollbar">
                  <div className="flex gap-4 min-w-max">
                      {gameState.players.map((p, idx) => {
                          const colors = getPlayerColor(idx);
                          const isActive = gameState.status === 'PLAYING' && p.id === currentPlayer.id;
                          
                          return (
                              <div 
                                key={p.id} 
                                className={`relative rounded-2xl p-4 flex flex-col items-center transition-all duration-300 w-24 md:w-32 ${isActive ? `scale-110 z-10 ring-4 ring-white/20 bg-white/10 pulse-glow` : 'bg-white/5 opacity-80'}`}
                                style={{ boxShadow: isActive ? colors.shadow : 'none' }}
                              >
                                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black text-lg mb-2 shadow-lg`} style={{backgroundColor: colors.bg, color: colors.text}}>
                                      {p.name.charAt(0)}
                                  </div>
                                  <div className="text-center w-full">
                                      <div className="font-bold text-sm md:text-base leading-tight truncate w-full">{p.name}</div>
                                      <div className="text-2xl font-black mt-1">{p.score}</div>
                                  </div>
                                  {isActive && (
                                      <div className="absolute -bottom-3 bg-white text-indigo-950 text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce">
                                          TURN
                                      </div>
                                  )}
                              </div>
                          );
                      })}
                  </div>
              </div>

              <div className="w-full max-w-md mb-8 flex flex-col items-center">
                   {gameState.status === 'LEADERBOARD' ? (
                        <div className="animate-bounce text-yellow-400 font-black text-3xl drop-shadow-lg flex items-center justify-center gap-2">
                             <Trophy size={32}/> {gameState.players.find(p=>p.id===gameState.winnerId)?.name} Wins!
                        </div>
                   ) : (
                       <div className="text-center w-full">
                           {isMyTurn ? (
                               <div className="text-white font-black text-2xl md:text-3xl animate-pulse mb-2">{t('dots.turn')}</div>
                           ) : (
                               <div className="text-white/50 font-bold text-xl mb-2">{t('dots.waitingFor')} {currentPlayer?.name}...</div>
                           )}
                           
                           {gameState.config.turnTimeLimit > 0 && (
                               <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden border border-white/5 relative">
                                    <div 
                                        className={`h-full transition-all duration-200 ease-linear ${timerPercent < 30 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-gradient-to-r from-cyan-400 to-blue-500'}`}
                                        style={{ width: `${timerPercent}%` }}
                                    />
                               </div>
                           )}
                       </div>
                   )}
              </div>

              <div className="w-full overflow-auto flex justify-center p-4">
                  <div className="bg-indigo-950/50 p-6 md:p-10 rounded-3xl shadow-2xl border border-white/5 backdrop-blur-sm min-w-min">
                    
                    <div className="flex flex-col items-center">
                        {Array.from({ length: totalGridRows }).map((_, rowIndex) => {
                            const isDotRow = rowIndex % 2 === 0;
                            const r = Math.floor(rowIndex / 2); // logical row index

                            return (
                                <div key={rowIndex} className="flex">
                                    {Array.from({ length: totalGridCols }).map((_, colIndex) => {
                                        const isDotCol = colIndex % 2 === 0;
                                        const c = Math.floor(colIndex / 2); // logical col index

                                        const isActiveBox = (br: number, bc: number) => {
                                            if (br < 0 || bc < 0 || br >= gameState.activeBoxes.length || bc >= gameState.activeBoxes[0].length) return false;
                                            return gameState.activeBoxes[br][bc];
                                        };

                                        // CASE 1: DOT (Even Row, Even Col)
                                        if (isDotRow && isDotCol) {
                                            const visible = isActiveBox(r-1, c-1) || isActiveBox(r-1, c) || isActiveBox(r, c-1) || isActiveBox(r, c);
                                            if (!visible) return <div key={colIndex} className="w-3 md:w-4 h-3 md:h-4" />;

                                            return (
                                                <div key={colIndex} className="w-3 h-3 md:w-4 md:h-4 bg-white rounded-full relative z-20 shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-transform hover:scale-125" />
                                            );
                                        }

                                        // CASE 2: HORIZONTAL LINE (Even Row, Odd Col)
                                        if (isDotRow && !isDotCol) {
                                            const visible = isActiveBox(r, c) || isActiveBox(r-1, c);
                                            if (!visible) return <div key={colIndex} className="w-12 md:w-16 h-3 md:h-4" />;

                                            const isActive = gameState.linesH[r][c];
                                            return (
                                                <div 
                                                    key={colIndex}
                                                    className={`w-12 md:w-16 h-3 md:h-4 flex items-center justify-center cursor-pointer relative group`}
                                                    onClick={() => handleLineClick('h', r, c, peerId)}
                                                >
                                                    <div className="absolute inset-0 -top-2 -bottom-2 z-10" /> 
                                                    <div className={`h-1.5 w-full rounded-full transition-all duration-300 ${isActive ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'bg-white/5 group-hover:bg-white/30'}`} />
                                                </div>
                                            );
                                        }

                                        // CASE 3: VERTICAL LINE (Odd Row, Even Col)
                                        if (!isDotRow && isDotCol) {
                                            const visible = isActiveBox(r, c) || isActiveBox(r, c-1);
                                            if (!visible) return <div key={colIndex} className="w-3 md:w-4 h-12 md:h-16" />;

                                            const isActive = gameState.linesV[r][c];
                                            return (
                                                <div 
                                                    key={colIndex}
                                                    className={`w-3 md:w-4 h-12 md:h-16 flex items-center justify-center cursor-pointer relative group`}
                                                    onClick={() => handleLineClick('v', r, c, peerId)}
                                                >
                                                    <div className="absolute inset-0 -left-2 -right-2 z-10" />
                                                    <div className={`w-1.5 h-full rounded-full transition-all duration-300 ${isActive ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'bg-white/5 group-hover:bg-white/30'}`} />
                                                </div>
                                            );
                                        }

                                        // CASE 4: BOX AREA (Odd Row, Odd Col)
                                        if (!isDotRow && !isDotCol) {
                                            if (!isActiveBox(r, c)) return <div key={colIndex} className="w-12 md:w-16 h-12 md:h-16" />;

                                            return (
                                                <div key={colIndex} className="relative w-12 md:w-16 h-12 md:h-16 flex items-center justify-center">
                                                    
                                                    {!isTriangleMode && (
                                                        <div className="absolute inset-1">
                                                            {gameState.boxes[r][c] && (() => {
                                                                const ownerIdx = gameState.players.findIndex(p => p.id === gameState.boxes[r][c]);
                                                                const colors = getPlayerColor(ownerIdx);
                                                                if(!colors) return null;
                                                                return (
                                                                    <div className={`w-full h-full rounded-lg shadow-inner flex items-center justify-center opacity-90 pop-in`} style={{backgroundColor: colors.bg}}>
                                                                        <span className={`font-black text-xl opacity-50`} style={{color: colors.text}}>{gameState.players[ownerIdx].name.charAt(0)}</span>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}

                                                    {isTriangleMode && (
                                                        <>
                                                            <div className="absolute inset-0" style={{ clipPath: 'polygon(0 0, 0 100%, 100% 100%)' }}>
                                                                {gameState.triangles[r][c].bottom && (() => {
                                                                    const ownerIdx = gameState.players.findIndex(p => p.id === gameState.triangles[r][c].bottom);
                                                                    const colors = getPlayerColor(ownerIdx);
                                                                    return <div className={`w-full h-full opacity-90 pop-in`} style={{backgroundColor: colors.bg}} />;
                                                                })()}
                                                            </div>
                                                            <div className="absolute inset-0" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }}>
                                                                 {gameState.triangles[r][c].top && (() => {
                                                                    const ownerIdx = gameState.players.findIndex(p => p.id === gameState.triangles[r][c].top);
                                                                    const colors = getPlayerColor(ownerIdx);
                                                                    return <div className={`w-full h-full opacity-90 pop-in`} style={{backgroundColor: colors.bg}} />;
                                                                })()}
                                                            </div>

                                                            <div 
                                                                className="absolute inset-0 cursor-pointer group z-10"
                                                                onClick={() => handleLineClick('d', r, c, peerId)}
                                                            >
                                                                <svg className="w-full h-full pointer-events-none" style={{overflow:'visible'}}>
                                                                    <line 
                                                                        x1="0" y1="0" x2="100%" y2="100%" 
                                                                        className={`stroke-[6px] transition-all duration-300 ${gameState.linesD[r][c] ? 'stroke-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]' : 'stroke-white/5 group-hover:stroke-white/30'}`}
                                                                        strokeLinecap="round"
                                                                    />
                                                                </svg>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        }

                                        return null;
                                    })}
                                </div>
                            );
                        })}
                    </div>
                  </div>
              </div>

              {gameState.status === 'LEADERBOARD' && (
                  <div className="mt-8">
                       <Button variant="glass" size="lg" onClick={backToLobby}>{t('finishGame')}</Button>
                  </div>
              )}
          </div>
      );
  }

  return <div>Unknown State</div>;
};

export default DotsAndBoxesGame;
