
import React, { useEffect, useState, useRef } from 'react';
import { usePeer } from '../../hooks/usePeer';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import { Button, Card, Input, Badge } from '../../components/ui/GenericUI';
import { TicTacToeGameState, Player } from '../../types';
import { Copy, Users, ArrowRight, Home, Trophy, Play, Loader2, X, Circle, RotateCcw, Clock, UserPlus, Eraser, Map, Shuffle, Zap, History, Siren, Bomb, Snowflake, EyeOff, Scale, Crown } from 'lucide-react';
import { FriendSystemModal } from '../../components/ui/FriendSystem';
import confetti from 'canvas-confetti';

const TicTacToeUltimateGame = ({ onExit, autoJoinCode }: { onExit: () => void, autoJoinCode?: string }) => {
  const { t } = useLanguage();
  const { user, addScore } = useUser();
  const [playerName, setPlayerName] = useState(user?.name || '');
  const [hasJoined, setHasJoined] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinGameCode, setJoinGameCode] = useState(autoJoinCode || '');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const timerRef = useRef<any>(null);

  // Game State
  const [gameState, setGameState] = useState<TicTacToeGameState>({
    status: 'LOBBY',
    players: [],
    currentPlayerIndex: 0,
    boards: Array(9).fill(null).map(() => Array(9).fill(null)),
    boardStatus: Array(9).fill(null),
    winningLines: Array(9).fill(null),
    boardEffects: {},
    activeBoardIndex: null,
    winnerId: null,
    config: { 
        turnDuration: 0, 
        gameMode: 'CLASSIC', 
        gravity: false, 
        fogOfWar: false,
        winCondition: 'LINE'
    },
    activePowerUp: null,
    gameLog: [],
    lastInteraction: 0
  });

  const { 
    displayCode,
    peerId, 
    isHost, 
    createGame,
    joinGame,
    broadcast, 
    sendToHost,
    setMessageHandler, 
    connectionStatus
  } = usePeer();

  // Auto-Join
  useEffect(() => {
    if (autoJoinCode && !hasJoined && connectionStatus === 'IDLE' && playerName) {
        joinGame(playerName, autoJoinCode);
    }
  }, [autoJoinCode, hasJoined, connectionStatus, playerName]);

  // Network Handlers
  useEffect(() => {
      setMessageHandler((data, conn) => {
          if (isHost) {
              if (data.type === 'JOIN') {
                  const newPlayer: Player = { id: data.payload.id, name: data.payload.name, isHost: false, score: 0, powerups: { eraser: 0, hallPass: 0, switch: 0, bomb: 0, freeze: 0 } };
                  setGameState(prev => {
                      if (prev.players.find(p => p.id === newPlayer.id)) {
                          if(conn) conn.send({ type: 'UPDATE_STATE', payload: prev });
                          return prev;
                      }
                      const newState = { ...prev, players: [...prev.players, newPlayer] };
                      broadcast({ type: 'UPDATE_STATE', payload: newState });
                      return newState;
                  });
              }
              else if (data.type === 'MOVE') {
                  handleMove(data.payload.boardIdx, data.payload.cellIdx, data.payload.playerId);
              }
              else if (data.type === 'ACTIVATE_POWERUP') {
                  handlePowerUp(data.payload.powerUp, data.payload.playerId);
              }
              else if (data.type === 'RESTART') {
                  startGame();
              }
          } else {
              if (data.type === 'UPDATE_STATE') {
                  setGameState(data.payload);
              }
          }
      });
  }, [isHost, broadcast, gameState]);

  useEffect(() => {
    if (connectionStatus === 'CONNECTED' && !hasJoined) {
      setHasJoined(true);
      if (isHost) {
         setGameState(prev => ({
             ...prev,
             players: [...prev.players, { id: peerId, name: playerName, isHost: true, score: 0, powerups: { eraser: 0, hallPass: 0, switch: 0, bomb: 0, freeze: 0 } }]
         }));
      }
    }
  }, [connectionStatus, hasJoined, isHost, peerId, playerName]);

  // Timer
  useEffect(() => {
      if (gameState.status === 'PLAYING' && gameState.config.turnDuration > 0) {
          const interval = setInterval(() => {
              const elapsed = (Date.now() - gameState.lastInteraction) / 1000;
              const remaining = Math.max(0, gameState.config.turnDuration - elapsed);
              setTimeLeft(remaining);

              if (remaining <= 0 && isHost) {
                  makeRandomMove();
              }
          }, 250);
          timerRef.current = interval;
          return () => clearInterval(interval);
      } else {
          if (timerRef.current) clearInterval(timerRef.current);
      }
  }, [gameState.status, gameState.lastInteraction, gameState.config.turnDuration, isHost]);


  // --- GAME LOGIC (HOST) ---

  const checkLine = (board: (string|null)[]) => {
      const wins = [
          [0,1,2], [3,4,5], [6,7,8], // Rows
          [0,3,6], [1,4,7], [2,5,8], // Cols
          [0,4,8], [2,4,6]           // Diagonals
      ];
      for (let w of wins) {
          if (board[w[0]] && board[w[0]] === board[w[1]] && board[w[0]] === board[w[2]]) {
              return { winner: board[w[0]], line: w };
          }
      }
      return null;
  };

  const isBoardFull = (board: (string|null)[]) => {
      return board.every(c => c !== null);
  };

  const getRandomPowerUp = () => {
      const types = ['eraser', 'hallPass', 'switch', 'bomb', 'freeze'];
      // Bomb and Freeze rare
      const rand = Math.random();
      if (rand < 0.1) return 'bomb';
      if (rand < 0.25) return 'freeze';
      if (rand < 0.5) return 'switch';
      if (rand < 0.75) return 'hallPass';
      return 'eraser';
  };

  const startGame = () => {
      if (!isHost || gameState.players.length < 2) return;
      
      const isExtreme = gameState.config.gameMode === 'EXTREME';

      const newState: TicTacToeGameState = {
          ...gameState,
          status: 'PLAYING',
          currentPlayerIndex: 0,
          boards: Array(9).fill(null).map(() => Array(9).fill(null)),
          boardStatus: Array(9).fill(null),
          winningLines: Array(9).fill(null),
          boardEffects: {},
          activeBoardIndex: null, // Start free
          winnerId: null,
          activePowerUp: null,
          gameLog: ['Game Started!'],
          players: gameState.players.map(p => ({
              ...p, 
              powerups: isExtreme ? { 
                  eraser: 1, 
                  hallPass: 1, 
                  switch: 1,
                  bomb: 0,
                  freeze: 0
              } : { eraser: 0, hallPass: 0, switch: 0, bomb: 0, freeze: 0 }
          })),
          lastInteraction: Date.now()
      };
      setGameState(newState);
      broadcast({ type: 'UPDATE_STATE', payload: newState });
  };

  const handlePowerUp = (type: string, playerId: string) => {
      if (!isHost) {
          sendToHost({ type: 'ACTIVATE_POWERUP', payload: { powerUp: type, playerId } });
          return;
      }

      setGameState(prev => {
          if (prev.status !== 'PLAYING') return prev;
          if (prev.players[prev.currentPlayerIndex].id !== playerId) return prev;
          
          const pIndex = prev.players.findIndex(p => p.id === playerId);
          const player = prev.players[pIndex];
          
          if (!player.powerups || player.powerups[type as keyof typeof player.powerups]! <= 0) return prev;

          let nextState = { ...prev };
          let used = false;
          let logMsg = "";

          // APPLY POWERUP LOGIC
          if (type === 'HALL_PASS') {
              nextState.activeBoardIndex = null;
              nextState.activePowerUp = 'HALL_PASS';
              logMsg = `${player.name} used HALL PASS!`;
              used = true;
          }
          else if (type === 'SWITCH') {
              const available = prev.boardStatus.map((s, i) => s === null ? i : -1).filter(i => i !== -1);
              if (available.length > 0) {
                  const randomIdx = available[Math.floor(Math.random() * available.length)];
                  nextState.activeBoardIndex = randomIdx;
                  logMsg = `${player.name} used SWITCH!`;
                  used = true;
              }
          }
          else if (type === 'ERASER') {
              nextState.activePowerUp = 'ERASER';
              logMsg = `${player.name} activated ERASER...`;
              used = false; // Deducted on use
          }
          else if (type === 'BOMB') {
              nextState.activePowerUp = 'BOMB';
              logMsg = `${player.name} activated NUKE...`;
              used = false;
          }
          else if (type === 'FREEZE') {
              nextState.activePowerUp = 'FREEZE';
              logMsg = `${player.name} activated FREEZE...`;
              used = false;
          }

          if (used) {
              nextState.players[pIndex].powerups = {
                  ...player.powerups!,
                  [type]: player.powerups![type as keyof typeof player.powerups]! - 1
              };
              nextState.gameLog = [logMsg, ...nextState.gameLog];
          } else {
              nextState.gameLog = [logMsg, ...nextState.gameLog];
          }

          broadcast({ type: 'UPDATE_STATE', payload: nextState });
          return nextState;
      });
  };

  const makeRandomMove = () => {
      if(!isHost) return;
      
      const activeBoard = gameState.activeBoardIndex;
      const validMoves: {b: number, c: number}[] = [];
      
      const checkBoard = (bIdx: number) => {
          if (gameState.boardStatus[bIdx]) return;
          // Check if frozen
          if (gameState.boardEffects[bIdx]?.type === 'FROZEN') return;

          gameState.boards[bIdx].forEach((cell, cIdx) => {
              if (cell === null) validMoves.push({b: bIdx, c: cIdx});
          });
      };

      if (activeBoard !== null) {
          checkBoard(activeBoard);
      } else {
          gameState.boardStatus.forEach((status, idx) => {
               if(!status) checkBoard(idx);
          });
      }

      if (validMoves.length > 0) {
          const move = validMoves[Math.floor(Math.random() * validMoves.length)];
          const playerId = gameState.players[gameState.currentPlayerIndex].id;
          handleMove(move.b, move.c, playerId);
      }
  };

  const handleMove = (boardIdx: number, cellIdx: number, playerId: string) => {
      if (!isHost) {
          sendToHost({ type: 'MOVE', payload: { boardIdx, cellIdx, playerId } });
          return;
      }
      
      setGameState(prev => {
          if (prev.status !== 'PLAYING') return prev;
          if (prev.players[prev.currentPlayerIndex].id !== playerId) return prev;
          
          let nextState = { ...prev };
          const playerIdx = prev.currentPlayerIndex;
          const player = prev.players[playerIdx];

          // --- POWERUP TARGETING LOGIC ---
          if (prev.activePowerUp === 'ERASER') {
              if (prev.boards[boardIdx][cellIdx] && !prev.boardStatus[boardIdx]) {
                   nextState.boards[boardIdx][cellIdx] = null;
                   nextState.players[playerIdx].powerups!.eraser--;
                   nextState.activePowerUp = null;
                   nextState.currentPlayerIndex = (prev.currentPlayerIndex + 1) % 2;
                   nextState.lastInteraction = Date.now();
                   broadcast({ type: 'UPDATE_STATE', payload: nextState });
                   return nextState;
              }
              return prev;
          }
          if (prev.activePowerUp === 'BOMB') {
              if (!prev.boardStatus[boardIdx]) {
                  nextState.boards[boardIdx] = Array(9).fill(null); // RESET
                  nextState.players[playerIdx].powerups!.bomb!--;
                  nextState.activePowerUp = null;
                  nextState.gameLog = [`${player.name} nuked a board!`, ...prev.gameLog];
                  nextState.currentPlayerIndex = (prev.currentPlayerIndex + 1) % 2;
                  nextState.lastInteraction = Date.now();
                  broadcast({ type: 'UPDATE_STATE', payload: nextState });
                  return nextState;
              }
              return prev;
          }
          if (prev.activePowerUp === 'FREEZE') {
              if (!prev.boardStatus[boardIdx] && !prev.boardEffects[boardIdx]) {
                  nextState.boardEffects[boardIdx] = { type: 'FROZEN', untilTurn: prev.currentPlayerIndex + 2 }; // Freeze for 1 full round (2 turns)
                  nextState.players[playerIdx].powerups!.freeze!--;
                  nextState.activePowerUp = null;
                  nextState.gameLog = [`${player.name} froze a board!`, ...prev.gameLog];
                  nextState.currentPlayerIndex = (prev.currentPlayerIndex + 1) % 2;
                  nextState.lastInteraction = Date.now();
                  broadcast({ type: 'UPDATE_STATE', payload: nextState });
                  return nextState;
              }
              return prev;
          }

          // --- NORMAL MOVE LOGIC ---
          
          // Validation
          if (prev.activeBoardIndex !== null && prev.activeBoardIndex !== boardIdx && prev.activePowerUp !== 'HALL_PASS') return prev;
          if (prev.boardStatus[boardIdx]) return prev;
          // Check Freeze
          if (prev.boardEffects[boardIdx]?.type === 'FROZEN') return prev;

          // GRAVITY LOGIC
          let targetCell = cellIdx;
          if (prev.config.gravity) {
              const col = cellIdx % 3;
              // Check bottom up: 6+col, 3+col, 0+col
              if (prev.boards[boardIdx][6 + col] === null) targetCell = 6 + col;
              else if (prev.boards[boardIdx][3 + col] === null) targetCell = 3 + col;
              else if (prev.boards[boardIdx][0 + col] === null) targetCell = 0 + col;
              else return prev; // Column full
          } else {
              if (prev.boards[boardIdx][cellIdx]) return prev; // Cell taken
          }

          const symbol = prev.currentPlayerIndex === 0 ? 'X' : 'O';
          
          // Apply Move
          const newBoards = [...prev.boards.map(r => [...r])];
          newBoards[boardIdx][targetCell] = symbol;
          nextState.boards = newBoards;

          // Check Sub-Board Win
          const newBoardStatus = [...prev.boardStatus];
          const newWinningLines = [...prev.winningLines];
          const winResult = checkLine(newBoards[boardIdx]);
          
          if (winResult) {
              newBoardStatus[boardIdx] = winResult.winner;
              newWinningLines[boardIdx] = winResult.line;
              
              if (prev.config.gameMode === 'EXTREME') {
                   const reward = getRandomPowerUp();
                   nextState.players[playerIdx].powerups = {
                       ...player.powerups!,
                       [reward]: player.powerups![reward as keyof typeof player.powerups]! + 1
                   };
                   nextState.gameLog = [`${player.name} won a board and got ${reward.toUpperCase()}!`, ...prev.gameLog];
              }
          } else if (isBoardFull(newBoards[boardIdx])) {
              newBoardStatus[boardIdx] = 'D'; // Draw/Full
          }
          
          nextState.boardStatus = newBoardStatus;
          nextState.winningLines = newWinningLines;

          // Check Global Win
          let globalWin = null;
          
          if (prev.config.winCondition === 'POINTS') {
              // Check if all boards are done (won or drawn)
              const allDone = newBoardStatus.every(s => s !== null);
              if (allDone) {
                  const xWins = newBoardStatus.filter(s => s === 'X').length;
                  const oWins = newBoardStatus.filter(s => s === 'O').length;
                  if (xWins > oWins) globalWin = 'X';
                  else if (oWins > xWins) globalWin = 'O';
                  else globalWin = 'D';
              }
          } else {
              // STANDARD LINE
              const lineWin = checkLine(newBoardStatus);
              if (lineWin) globalWin = lineWin.winner;
              else if (newBoardStatus.every(s => s !== null)) globalWin = 'D';
          }
          
          nextState.lastInteraction = Date.now();
          nextState.activePowerUp = null; // Clear Hall Pass if used

          if (globalWin) {
              nextState.status = 'GAME_OVER';
              // Find player ID for winner symbol
              if (globalWin === 'X') nextState.winnerId = prev.players[0].id;
              else if (globalWin === 'O') nextState.winnerId = prev.players[1].id;
              else nextState.winnerId = null; // Draw

              if (nextState.winnerId) {
                  addScore(100); 
                  confetti();
              }
          } else {
              // Cleanup expired effects
              const newEffects = { ...prev.boardEffects };
              Object.keys(newEffects).forEach(key => {
                  const k = parseInt(key);
                  // If effect expires this turn (conceptually)
                  // Actually, just checking freeze logic in validation is enough, 
                  // we remove it when the turn counter passes? 
                  // Simplified: Remove freeze if we visit the board? No.
                  // Let's just remove specific freeze if duration expired?
                  // Easier: Random Chaos events might clear effects.
                  // For now, let's say Freeze lasts 2 moves (1 round).
                  if (newEffects[k].untilTurn <= nextState.gameLog.length) { // Using gameLog length as rudimentary turn counter
                      delete newEffects[k];
                  }
              });
              nextState.boardEffects = newEffects;

              // Chaos Logic
              if (prev.config.gameMode === 'EXTREME' && Math.random() < 0.1) {
                   const eventType = Math.random() > 0.5 ? 'FIRE_DRILL' : 'POP_QUIZ';
                   if (eventType === 'FIRE_DRILL') {
                        const available = newBoardStatus.map((s, i) => s === null ? i : -1).filter(i => i !== -1);
                        if(available.length > 0) {
                            nextState.activeBoardIndex = available[Math.floor(Math.random() * available.length)];
                            nextState.gameLog = ["🔥 CHAOS: Fire Drill! Active board changed!", ...nextState.gameLog];
                        }
                   } else {
                        const availableCells: {b:number, c:number}[] = [];
                        newBoards.forEach((b, bi) => {
                             if (!newBoardStatus[bi]) b.forEach((c, ci) => { if(c === null) availableCells.push({b: bi, c: ci}); });
                        });
                        if (availableCells.length > 0) {
                             const target = availableCells[Math.floor(Math.random() * availableCells.length)];
                             newBoards[target.b][target.c] = Math.random() > 0.5 ? 'X' : 'O';
                             nextState.gameLog = ["⚡ CHAOS: Pop Quiz! A random cell was filled!", ...nextState.gameLog];
                        }
                   }
              } else {
                  nextState.activeBoardIndex = newBoardStatus[targetCell] ? null : targetCell;
              }

              nextState.currentPlayerIndex = (prev.currentPlayerIndex + 1) % 2;
          }
          
          broadcast({ type: 'UPDATE_STATE', payload: nextState });
          return nextState;
      });
  };

  const updateConfig = (key: string, val: any) => {
      if(!isHost) return;
      const newState = { ...gameState, config: { ...gameState.config, [key]: val } };
      setGameState(newState);
      broadcast({ type: 'UPDATE_STATE', payload: newState });
  };

  // --- RENDER ---

  if (!hasJoined) {
     return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 w-full max-w-xl mx-auto">
             <div className="absolute top-6 left-6">
                <Button variant="glass" size="sm" onClick={onExit}>
                    <Home className="mr-2" size={18}/> Exit
                </Button>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500 mb-8 drop-shadow-2xl text-center flex flex-col items-center gap-4">
                <div className="flex gap-2">
                    <X size={60} className="text-cyan-400" strokeWidth={3} />
                    <Circle size={60} className="text-indigo-400" strokeWidth={3} />
                </div>
                {t('game.tictactoe')}
            </h1>
            <Card className="w-full flex flex-col gap-6">
                <Input placeholder={t('enterName')} value={playerName} onChange={e => setPlayerName(e.target.value)} maxLength={15} />
                {!showJoinInput && !autoJoinCode ? (
                    <div className="grid grid-cols-2 gap-4">
                        <Button variant="primary" onClick={() => createGame(playerName)} className="bg-cyan-600 hover:bg-cyan-500 border-cyan-800">{t('create')}</Button>
                        <Button variant="glass" onClick={() => setShowJoinInput(true)}>{t('join')}</Button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <Input placeholder="CODE" value={joinGameCode} onChange={e => setJoinGameCode(e.target.value.toUpperCase())} maxLength={4} className="tracking-[0.5em] text-3xl font-mono uppercase"/>
                        <div className="flex gap-2">
                             <Button className="flex-1 bg-cyan-600 hover:bg-cyan-500 border-cyan-800" onClick={() => joinGame(playerName, joinGameCode)}>{connectionStatus === 'CONNECTING' ? <Loader2 className="animate-spin"/> : t('connect')}</Button>
                             <Button variant="glass" onClick={onExit}><ArrowRight className="rotate-180"/></Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
     );
  }

  // LOBBY
  if (gameState.status === 'LOBBY') {
      return (
          <div className="flex flex-col items-center pt-8 md:pt-16 min-h-screen p-4 max-w-4xl mx-auto w-full">
              <div className="w-full flex justify-between mb-8">
                  <Button variant="glass" size="sm" onClick={onExit}>
                      <ArrowRight className="rotate-180 mr-2" size={18}/> Exit
                  </Button>
                  <div className="bg-black/40 px-6 py-2 rounded-full font-mono font-bold text-xl border border-white/10 flex items-center gap-3 backdrop-blur-md">
                      CODE: <span className="text-cyan-400 select-all cursor-pointer" onClick={()=>{navigator.clipboard.writeText(displayCode||joinGameCode)}}>{displayCode || joinGameCode}</span> <Copy size={16}/>
                  </div>
                  {isHost && (
                      <Button variant="secondary" size="sm" onClick={() => setShowInviteModal(true)}>
                         <UserPlus size={18}/> Invite
                      </Button>
                  )}
              </div>

              {isHost && (
                  <Card className="w-full mb-8 bg-white/5 border-white/10">
                       <div className="flex flex-col gap-6">
                           <div>
                              <label className="text-sm font-bold text-white/60 mb-2 block">Game Mode</label>
                              <div className="flex gap-2 bg-black/20 p-2 rounded-xl">
                                  {['CLASSIC', 'EXTREME'].map(mode => (
                                      <button 
                                        key={mode}
                                        onClick={() => updateConfig('gameMode', mode)}
                                        className={`flex-1 py-3 rounded-lg font-bold transition-all ${gameState.config.gameMode === mode ? 'bg-cyan-600 text-white shadow-lg' : 'text-white/40 hover:bg-white/5'}`}
                                      >
                                          {t(`tictactoe.settings.${mode.toLowerCase()}`) || mode}
                                      </button>
                                  ))}
                              </div>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                               <button 
                                  onClick={() => updateConfig('gravity', !gameState.config.gravity)}
                                  className={`p-4 rounded-xl border-2 flex items-center justify-between ${gameState.config.gravity ? 'bg-purple-600 border-purple-400' : 'bg-white/5 border-white/10 opacity-60'}`}
                               >
                                   <div className="flex items-center gap-2 font-bold"><ArrowRight className="rotate-90"/> {t('tictactoe.settings.gravity')}</div>
                                   {gameState.config.gravity && <CheckIcon/>}
                               </button>

                               <button 
                                  onClick={() => updateConfig('fogOfWar', !gameState.config.fogOfWar)}
                                  className={`p-4 rounded-xl border-2 flex items-center justify-between ${gameState.config.fogOfWar ? 'bg-slate-600 border-slate-400' : 'bg-white/5 border-white/10 opacity-60'}`}
                               >
                                   <div className="flex items-center gap-2 font-bold"><EyeOff/> {t('tictactoe.settings.fog')}</div>
                                   {gameState.config.fogOfWar && <CheckIcon/>}
                               </button>

                               <button 
                                  onClick={() => updateConfig('winCondition', gameState.config.winCondition === 'LINE' ? 'POINTS' : 'LINE')}
                                  className={`p-4 rounded-xl border-2 flex items-center justify-between bg-white/10 border-white/20`}
                               >
                                   <div className="flex items-center gap-2 font-bold">
                                       {gameState.config.winCondition === 'LINE' ? <Scale/> : <Crown/>} 
                                       {gameState.config.winCondition === 'LINE' ? t('tictactoe.settings.winLine') : t('tictactoe.settings.winPoints')}
                                   </div>
                               </button>
                           </div>

                           <div className="flex items-center gap-4">
                              <label className="text-sm font-bold text-white/60 whitespace-nowrap">Turn Timer</label>
                              <div className="flex gap-2 flex-1 items-center">
                                  <input 
                                      type="range" min="0" max="60" step="5" 
                                      value={gameState.config.turnDuration}
                                      onChange={(e) => updateConfig('turnDuration', parseInt(e.target.value))}
                                      className="w-full h-3 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                  />
                                  <span className="font-mono font-bold w-16 text-right">
                                      {gameState.config.turnDuration === 0 ? 'Off' : `${gameState.config.turnDuration}s`}
                                  </span>
                              </div>
                          </div>
                      </div>
                  </Card>
              )}

              <div className="w-full mb-10">
                  <div className="flex items-center justify-between mb-4 px-2">
                      <h3 className="text-white/50 uppercase text-sm font-bold tracking-widest flex items-center gap-2"><Users size={16}/> {t('players')}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      {gameState.players.map((p, idx) => (
                          <div key={p.id} className="bg-white/10 rounded-2xl p-6 flex flex-col items-center border-2 border-white/5 relative slide-up">
                              <div className={`w-16 h-16 rounded-full flex items-center justify-center font-black text-3xl shadow-lg mb-2 ${idx===0 ? 'bg-cyan-500 text-white' : 'bg-indigo-500 text-white'}`}>
                                  {idx === 0 ? 'X' : idx === 1 ? 'O' : '?'}
                              </div>
                              <span className="font-bold text-lg">{p.name}</span>
                          </div>
                      ))}
                      {gameState.players.length < 2 && (
                          <div className="bg-white/5 border-2 border-dashed border-white/10 rounded-2xl p-6 flex items-center justify-center text-white/30 font-bold italic">
                              Waiting for opponent...
                          </div>
                      )}
                  </div>
              </div>

              {isHost && (
                  <Button variant="success" size="xl" onClick={startGame} disabled={gameState.players.length < 2} className="w-full bg-emerald-600 border-emerald-800 shadow-xl">
                      <Play className="mr-2"/> Start Game
                  </Button>
              )}
              
              <FriendSystemModal 
                  isOpen={showInviteModal} 
                  onClose={() => setShowInviteModal(false)} 
                  inviteMode={true} 
                  currentGameInfo={{ type: 'tictactoe', code: displayCode || joinGameCode }}
              />
          </div>
      );
  }

  // GAME
  if (gameState.status === 'PLAYING' || gameState.status === 'GAME_OVER') {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      const isMyTurn = currentPlayer?.id === peerId && gameState.status === 'PLAYING';
      const myPowerups = gameState.players.find(p => p.id === peerId)?.powerups;
      const timerPercent = gameState.config.turnDuration > 0 ? (timeLeft / gameState.config.turnDuration) * 100 : 100;
      const isExtreme = gameState.config.gameMode === 'EXTREME';
      const isFog = gameState.config.fogOfWar;
      
      const targetingMode = gameState.activePowerUp === 'ERASER' || gameState.activePowerUp === 'BOMB' || gameState.activePowerUp === 'FREEZE';
      const isErasing = gameState.activePowerUp === 'ERASER';

      return (
          <div className="flex flex-col min-h-screen p-2 md:p-6 items-center w-full max-w-6xl mx-auto">
               
               {/* HEADER */}
               <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                  <div className="flex gap-4 items-center w-full md:w-auto">
                      <Button variant="glass" size="sm" onClick={() => { if(confirm("Quit?")) onExit(); }}>
                          <Home size={18}/>
                      </Button>
                      <div className={`px-6 py-3 rounded-2xl font-black text-xl flex items-center gap-2 border-2 ${isMyTurn ? 'bg-cyan-500/20 border-cyan-400 text-white animate-pulse' : 'bg-white/5 border-white/10 text-white/50'}`}>
                          {gameState.status === 'GAME_OVER' 
                            ? (gameState.winnerId === peerId ? "VICTORY!" : "GAME OVER")
                            : (isMyTurn ? t('dots.turn') : `${currentPlayer?.name}'s Turn`)
                          }
                      </div>
                  </div>

                  {/* LOG for EXTREME MODE */}
                  {isExtreme && (
                      <div className="h-10 overflow-hidden relative flex-1 w-full md:w-auto bg-black/30 rounded-lg flex items-center px-4">
                          {gameState.gameLog.length > 0 && (
                              <div key={gameState.gameLog[0]} className="text-xs md:text-sm font-bold text-yellow-300 animate-slide-up flex items-center gap-2">
                                  <Siren size={14} className="animate-pulse"/> {gameState.gameLog[0]}
                              </div>
                          )}
                      </div>
                  )}

                  {/* TIMER */}
                  {gameState.config.turnDuration > 0 && gameState.status === 'PLAYING' && (
                      <div className="w-24 h-8 bg-black/40 rounded-full border border-white/10 relative overflow-hidden flex items-center justify-center">
                          <div className={`absolute left-0 top-0 bottom-0 transition-all duration-300 ease-linear opacity-30 ${timeLeft < 5 ? 'bg-red-500' : 'bg-cyan-500'}`} style={{width: `${timerPercent}%`}}/>
                          <span className="relative z-10 font-mono font-bold text-sm flex items-center gap-1"><Clock size={12}/> {Math.ceil(timeLeft)}s</span>
                      </div>
                  )}
              </div>

              {gameState.config.winCondition === 'POINTS' && (
                  <div className="flex gap-8 mb-4 bg-black/20 px-6 py-2 rounded-full border border-white/10">
                      <div className="flex items-center gap-2">
                          <X className="text-cyan-400"/> 
                          <span className="font-black text-2xl">{gameState.boardStatus.filter(s => s === 'X').length}</span>
                      </div>
                      <div className="h-8 w-px bg-white/10"/>
                      <div className="flex items-center gap-2">
                          <Circle className="text-indigo-400"/> 
                          <span className="font-black text-2xl">{gameState.boardStatus.filter(s => s === 'O').length}</span>
                      </div>
                  </div>
              )}

              <div className="flex flex-col lg:flex-row gap-6 w-full items-start justify-center">
                  
                  {/* LEFT: POWERUPS (EXTREME ONLY) */}
                  {isExtreme && (
                      <div className="w-full lg:w-48 bg-white/5 rounded-3xl p-4 border border-white/10 order-2 lg:order-1 flex lg:flex-col gap-3 overflow-x-auto lg:overflow-visible bubble-scrollbar">
                          
                          {[
                              { id: 'hallPass', icon: Map, color: 'purple', label: 'Pass' },
                              { id: 'eraser', icon: Eraser, color: 'pink', label: 'Eraser' },
                              { id: 'switch', icon: Shuffle, color: 'orange', label: 'Switch' },
                              { id: 'bomb', icon: Bomb, color: 'red', label: 'Nuke' },
                              { id: 'freeze', icon: Snowflake, color: 'cyan', label: 'Freeze' }
                          ].map(pu => (
                              <button 
                                key={pu.id}
                                disabled={!isMyTurn || !(myPowerups as any)?.[pu.id]} 
                                onClick={() => handlePowerUp(pu.id === 'hallPass' ? 'HALL_PASS' : pu.id === 'switch' ? 'SWITCH' : pu.id.toUpperCase(), peerId)}
                                className={`flex-1 min-w-[70px] lg:w-full p-3 rounded-xl border-2 flex flex-col items-center justify-center transition-all 
                                    ${(myPowerups as any)?.[pu.id] ? `bg-${pu.color}-600 border-${pu.color}-400 hover:scale-105 shadow-lg` : 'bg-white/5 border-white/10 opacity-50 grayscale'}
                                    ${gameState.activePowerUp === pu.id.toUpperCase() ? 'ring-4 ring-yellow-400 animate-pulse' : ''}
                                `}
                              >
                                  <pu.icon size={20} className="mb-1"/>
                                  <div className="text-[10px] font-bold uppercase tracking-wider">{pu.label}</div>
                                  <div className="text-sm font-black bg-black/20 rounded px-2 mt-1">x{(myPowerups as any)?.[pu.id] || 0}</div>
                              </button>
                          ))}
                      </div>
                  )}

                  {/* CENTER: GAME BOARD */}
                  <div className="flex-1 aspect-square max-w-[600px] bg-black/40 p-2 md:p-4 rounded-3xl border-4 border-white/10 grid grid-cols-3 gap-2 md:gap-3 relative shadow-2xl order-1 lg:order-2 mx-auto">
                      
                      {gameState.boards.map((board, bIdx) => {
                          const isActive = (gameState.activeBoardIndex === null || gameState.activeBoardIndex === bIdx) && !gameState.boardStatus[bIdx] && gameState.status === 'PLAYING';
                          const status = gameState.boardStatus[bIdx];
                          const winLine = gameState.winningLines[bIdx];
                          const isFrozen = gameState.boardEffects[bIdx]?.type === 'FROZEN';
                          
                          // Fog Logic: If fog is on, non-active boards are dimmed heavily, unless won
                          const isDimmed = isFog && !isActive && !status && gameState.status === 'PLAYING';

                          return (
                              <div 
                                  key={bIdx} 
                                  className={`
                                      relative bg-[#1e1b4b] rounded-xl md:rounded-2xl grid grid-cols-3 gap-1 p-1 md:p-1.5 border-2 transition-all duration-500
                                      ${isActive && isMyTurn ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)] z-10' : 'border-white/5'}
                                      ${status ? 'opacity-90' : ''}
                                      ${isFrozen ? 'border-cyan-400 shadow-[0_0_15px_cyan] pointer-events-none' : ''}
                                      ${isDimmed ? 'opacity-20 blur-[1px]' : 'opacity-100'}
                                      ${targetingMode && !status ? 'cursor-crosshair hover:border-red-500' : ''}
                                  `}
                                  onClick={() => {
                                      // Global click handler for board-level powerups (Bomb, Freeze)
                                      if ((gameState.activePowerUp === 'BOMB' || gameState.activePowerUp === 'FREEZE') && isMyTurn) {
                                          handleMove(bIdx, 0, peerId); // cellIdx 0 is dummy, logic handled in handleMove
                                      }
                                  }}
                              >
                                  {isFrozen && (
                                      <div className="absolute inset-0 z-40 flex items-center justify-center bg-cyan-900/30 backdrop-blur-[2px]">
                                          <Snowflake size={40} className="text-cyan-400 animate-spin-slow"/>
                                      </div>
                                  )}

                                  {/* Sub Board Cells */}
                                  {board.map((cell, cIdx) => (
                                      <button
                                          key={cIdx}
                                          disabled={(!isActive || !isMyTurn || (cell !== null && !isErasing)) && !targetingMode}
                                          onClick={(e) => {
                                              e.stopPropagation();
                                              handleMove(bIdx, cIdx, peerId);
                                          }}
                                          className={`
                                              rounded md:rounded-lg flex items-center justify-center text-lg md:text-2xl font-black transition-colors relative
                                              ${cell === null 
                                                  ? (isActive && isMyTurn && !targetingMode ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5') 
                                                  : (cell === 'X' ? 'bg-cyan-900/50 text-cyan-400' : 'bg-indigo-900/50 text-indigo-400')
                                              }
                                              ${isErasing && cell && isMyTurn && !status ? 'animate-pulse bg-red-900/50 hover:bg-red-500 cursor-pointer' : ''}
                                          `}
                                      >
                                          {cell}
                                      </button>
                                  ))}
                                  
                                  {/* WINNING LINE SVG */}
                                  {winLine && (
                                      <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                                          {(() => {
                                              const startIdx = winLine[0];
                                              const endIdx = winLine[2];
                                              
                                              const getCoord = (idx: number) => {
                                                  const r = Math.floor(idx / 3);
                                                  const c = idx % 3;
                                                  return { x: (c * 33.3) + 16.6, y: (r * 33.3) + 16.6 };
                                              };
                                              
                                              const s = getCoord(startIdx);
                                              const e = getCoord(endIdx);
                                              
                                              return (
                                                  <line 
                                                    x1={`${s.x}%`} y1={`${s.y}%`} x2={`${e.x}%`} y2={`${e.y}%`} 
                                                    stroke={status === 'X' ? '#22d3ee' : '#818cf8'} 
                                                    strokeWidth="10" 
                                                    strokeLinecap="round"
                                                    className="draw-enter drop-shadow-lg"
                                                  />
                                              );
                                          })()}
                                      </svg>
                                  )}

                                  {/* BOARD STATUS OVERLAY (Full Win/Draw) */}
                                  {status && !winLine && (
                                      <div className={`absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl backdrop-blur-[1px] animate-pop-in z-30`}>
                                          <span className={`text-6xl md:text-8xl font-black ${status === 'X' ? 'text-cyan-500' : status === 'O' ? 'text-indigo-500' : 'text-white/20'}`}>
                                              {status === 'D' ? '-' : status}
                                          </span>
                                      </div>
                                  )}
                              </div>
                          );
                      })}
                      
                      {/* GLOBAL WIN OVERLAY */}
                      {gameState.status === 'GAME_OVER' && (
                          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-3xl animate-in fade-in zoom-in">
                              {gameState.winnerId ? (
                                  <>
                                      <Trophy size={80} className="text-yellow-400 mb-4 animate-bounce"/>
                                      <div className="text-4xl font-black text-white text-center px-4">
                                          {gameState.players.find(p=>p.id===gameState.winnerId)?.name} Wins!
                                      </div>
                                  </>
                              ) : (
                                  <div className="text-4xl font-black text-white/50">Draw Game!</div>
                              )}
                              
                              {isHost && (
                                  <Button variant="primary" size="lg" className="mt-8" onClick={() => sendToHost({type: 'RESTART', payload:{}})}>
                                      <RotateCcw className="mr-2"/> Play Again
                                  </Button>
                              )}
                          </div>
                      )}
                  </div>
                  
                  {/* RIGHT: INFO/LEGEND */}
                  <div className="hidden lg:block w-48 order-3">
                      <div className="bg-white/5 rounded-3xl p-4 border border-white/10 text-xs text-white/50 space-y-4">
                          <div>
                              <div className="font-bold text-white uppercase mb-1">Status</div>
                              <div className="flex gap-2 items-center"><div className="w-3 h-3 bg-white/10 rounded"/> Standard</div>
                              <div className="flex gap-2 items-center"><div className="w-3 h-3 border border-yellow-400 rounded"/> Active Board</div>
                          </div>
                          {gameState.config.gravity && (
                              <div className="text-cyan-300 font-bold flex items-center gap-2">
                                  <ArrowRight className="rotate-90" size={14}/> Gravity On
                              </div>
                          )}
                      </div>
                  </div>

              </div>
          </div>
      );
  }

  return null;
};

const CheckIcon = () => <div className="bg-green-500 rounded-full p-0.5"><div className="w-3 h-3 text-black">✓</div></div>;

export default TicTacToeUltimateGame;
