
import React, { useEffect, useState, useRef } from 'react';
import { usePeer } from '../../hooks/usePeer';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import { Button, Card, Input, Badge } from '../../components/ui/GenericUI';
import { FriendSystemModal } from '../../components/ui/FriendSystem';
import { HangmanGameState, Player, Language, GameStatus } from '../../types';
import { LETTERS_AR, LETTERS_EN } from '../../constants';
import { Copy, Users, Play, AlertTriangle, Settings, Loader2, Eraser, Smile, Frown, Check, X, RotateCcw, Eye, EyeOff, Home, Keyboard, Lightbulb, Clock, Tag, Skull, ArrowLeft, UserPlus } from 'lucide-react';
import confetti from 'canvas-confetti';

const HangmanGame = ({ onExit, autoJoinCode }: { onExit: () => void, autoJoinCode?: string }) => {
  const { t, lang } = useLanguage();
  const { user } = useUser();
  const [playerName, setPlayerName] = useState(user?.name || '');
  const [hasJoined, setHasJoined] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinGameCode, setJoinGameCode] = useState(autoJoinCode || '');
  const [secretInput, setSecretInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Game State
  const [gameState, setGameState] = useState<HangmanGameState>({
    status: 'LOBBY',
    players: [],
    currentPlayerIndex: 0,
    config: {
      maxWrongGuesses: 10,
      wordLanguage: lang,
      turnDuration: 0,
    },
    secretWord: '',
    guessedLetters: [],
    wrongGuesses: 0,
    winnerId: null,
    lastInteraction: 0
  });

  const timerRef = useRef<any>(null);

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

  // Auto-Join Logic
  useEffect(() => {
    if (autoJoinCode && !hasJoined && connectionStatus === 'IDLE' && playerName) {
        joinGame(playerName, autoJoinCode);
    }
  }, [autoJoinCode, hasJoined, connectionStatus, playerName]);

  // --------------------------------------------------------------------------
  // HANGMAN DRAWING
  // --------------------------------------------------------------------------
  const renderHangman = (wrongCount: number, max: number, isWinner: boolean, isLoser: boolean) => {
    const steps = max === 6 ? [5,6,7,8,9,10] : [1,2,3,4,5,6,7,8,9,10];
    const currentStep = max === 6 ? wrongCount + 4 : wrongCount;
    const strokeColor = "white";
    const strokeWidth = 3;
    const chalkFilter = "url(#chalk-rough)";
    const HEAD_CX = 140;
    const HEAD_CY = 70;
    const HEAD_R = 20;
    const BODY_TOP = 90;
    const BODY_BOT = 150;
    const ARM_Y = 100;

    return (
      <svg viewBox="0 0 200 260" className="w-full h-full max-h-[350px] overflow-visible drop-shadow-2xl">
        <defs>
             <filter id="chalk-rough">
                <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" seed="5"/>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
             </filter>
        </defs>
        
        {(max === 6 || currentStep >= 1) && <path d="M20,240 L100,240 M60,240 L60,20" stroke={strokeColor} strokeWidth={strokeWidth} filter={chalkFilter} fill="none" strokeLinecap="round" className="draw-enter" />}
        {(max === 6 || currentStep >= 3) && <path d="M58,20 L140,20 M140,20 L140,50" stroke={strokeColor} strokeWidth={strokeWidth} filter={chalkFilter} fill="none" strokeLinecap="round" className="draw-enter" />}
        
        {currentStep >= 5 && (
            <g className="pop-in">
                <circle cx={HEAD_CX} cy={HEAD_CY} r={HEAD_R} stroke={strokeColor} strokeWidth={strokeWidth} fill="none" filter={chalkFilter}/>
                {isLoser && (
                    <g stroke={strokeColor} strokeWidth={2} filter={chalkFilter} className="animate-pulse">
                         <path d="M132,65 L138,71 M138,65 L132,71" />
                         <path d="M142,65 L148,71 M148,65 L142,71" />
                         <path d="M135,82 Q140,78 145,82" fill="none" />
                    </g>
                )}
                {isWinner && (
                    <g stroke={strokeColor} strokeWidth={2} filter={chalkFilter} className="animate-bounce">
                        <circle cx="135" cy="68" r="1.5" fill="white" stroke="none"/>
                        <circle cx="145" cy="68" r="1.5" fill="white" stroke="none"/>
                        <path d="M135,78 Q140,85 145,78" fill="none" />
                    </g>
                )}
            </g>
        )}

        {currentStep >= 6 && <line x1={HEAD_CX} y1={BODY_TOP} x2={HEAD_CX} y2={BODY_BOT} stroke={strokeColor} strokeWidth={strokeWidth} filter={chalkFilter} strokeLinecap="round" className="draw-enter" />}
        {currentStep >= 7 && <line x1={HEAD_CX} y1={ARM_Y} x2={110} y2={130} stroke={strokeColor} strokeWidth={strokeWidth} filter={chalkFilter} strokeLinecap="round" className="draw-enter" />}
        {currentStep >= 8 && <line x1={HEAD_CX} y1={ARM_Y} x2={170} y2={130} stroke={strokeColor} strokeWidth={strokeWidth} filter={chalkFilter} strokeLinecap="round" className="draw-enter" />}
        {currentStep >= 9 && <line x1={HEAD_CX} y1={BODY_BOT} x2={110} y2={200} stroke={strokeColor} strokeWidth={strokeWidth} filter={chalkFilter} strokeLinecap="round" className="draw-enter" />}
        {currentStep >= 10 && <line x1={HEAD_CX} y1={BODY_BOT} x2={170} y2={200} stroke={strokeColor} strokeWidth={strokeWidth} filter={chalkFilter} strokeLinecap="round" className="draw-enter" />}
      </svg>
    );
  };

  // --------------------------------------------------------------------------
  // NETWORK HANDLING
  // --------------------------------------------------------------------------
  
  useEffect(() => {
    setMessageHandler((data, conn) => {
      if (isHost) {
        if (data.type === 'JOIN') {
          const newPlayer: Player = { id: data.payload.id, name: data.payload.name, isHost: false, score: 0 };
          setGameState(prev => {
            if (prev.players.find(p => p.id === newPlayer.id)) {
                if(conn) sendTo(conn, { type: 'UPDATE_STATE', payload: prev });
                return prev;
            }
            const newState = { ...prev, players: [...prev.players, newPlayer] };
            if(conn) sendTo(conn, { type: 'UPDATE_STATE', payload: newState });
            broadcast({ type: 'UPDATE_STATE', payload: newState });
            return newState;
          });
        }
        else if (data.type === 'GUESS_LETTER') {
            handleGuess(data.payload.letter, data.payload.playerId, data.payload.isHint);
        }
        else if (data.type === 'SKIP_TURN') {
            handleSkipTurn(data.payload.playerId);
        }
      }
      if (!isHost) {
        if (data.type === 'UPDATE_STATE') {
          setGameState(data.payload);
        }
      }
    });
  }, [isHost, broadcast, gameState, sendTo]);

  useEffect(() => {
    if (connectionStatus === 'CONNECTED' && !hasJoined) {
      setHasJoined(true);
      if (isHost) {
         setGameState(prev => ({
             ...prev,
             players: [...prev.players, { id: peerId, name: playerName, isHost: true, score: 0 }]
         }));
      }
    }
  }, [connectionStatus, hasJoined, isHost, peerId, playerName]);


  // --------------------------------------------------------------------------
  // TIMER LOGIC
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (gameState.status === 'PLAYING' && gameState.config.turnDuration > 0) {
        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = (now - gameState.lastInteraction) / 1000;
            const remaining = Math.max(0, gameState.config.turnDuration - elapsed);
            setTimeLeft(remaining);

            if (remaining <= 0 && isHost) {
                handleSkipTurn(gameState.players[gameState.currentPlayerIndex].id);
            }
        }, 100);
        timerRef.current = interval;
        return () => clearInterval(interval);
    } else {
        if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [gameState.status, gameState.lastInteraction, gameState.config.turnDuration, isHost]);


  // --------------------------------------------------------------------------
  // GAME LOGIC (HOST)
  // --------------------------------------------------------------------------

  const backToLobby = () => {
      if (isHost) {
          setGameState(prev => {
              const newState: HangmanGameState = {
                  ...prev,
                  status: 'LOBBY',
                  secretWord: '',
                  guessedLetters: [],
                  wrongGuesses: 0,
                  winnerId: null,
                  currentPlayerIndex: 0
              };
              broadcast({ type: 'UPDATE_STATE', payload: newState });
              return newState;
          });
      } else {
          onExit();
      }
  };

  const startGameSetup = () => {
      if(!isHost) return;
      const newState: HangmanGameState = {
          ...gameState,
          status: 'SETUP',
          currentPlayerIndex: 0,
          secretWord: '',
          category: '',
          guessedLetters: [],
          wrongGuesses: 0,
          winnerId: null
      };
      setGameState(newState);
      broadcast({ type: 'UPDATE_STATE', payload: newState });
  };

  const confirmSecretWord = () => {
      if(!isHost) return;
      const cleanWord = secretInput.trim().toUpperCase();
      if(cleanWord.length < 2) return;
      
      const isAr = /[\u0600-\u06FF]/.test(cleanWord);
      
      let nextIndex = gameState.players.findIndex(p => !p.isHost);
      if (nextIndex === -1) nextIndex = 0;

      const newState: HangmanGameState = {
          ...gameState,
          status: 'PLAYING',
          secretWord: cleanWord,
          category: categoryInput.trim(),
          guessedLetters: [],
          wrongGuesses: 0,
          config: {
              ...gameState.config,
              wordLanguage: isAr ? Language.AR : Language.EN
          },
          currentPlayerIndex: nextIndex,
          lastInteraction: Date.now()
      };
      setGameState(newState);
      broadcast({ type: 'UPDATE_STATE', payload: newState });
      setSecretInput('');
      setCategoryInput('');
  };

  const handleSkipTurn = (playerId: string) => {
      if (!isHost) {
          sendToHost({ type: 'SKIP_TURN', payload: { playerId } });
          return;
      }
      
      setGameState(prev => {
          if (prev.status !== 'PLAYING') return prev;
          if (prev.players[prev.currentPlayerIndex].id !== playerId) return prev;

          let nextPlayerIndex = (prev.currentPlayerIndex + 1) % prev.players.length;
          if (prev.players.length > 1 && prev.players[nextPlayerIndex].isHost) {
              nextPlayerIndex = (nextPlayerIndex + 1) % prev.players.length;
          }

          const newState = {
              ...prev,
              currentPlayerIndex: nextPlayerIndex,
              lastInteraction: Date.now()
          };
          broadcast({ type: 'UPDATE_STATE', payload: newState });
          return newState;
      });
  };

  const handleGuess = (letter: string, playerId: string, isHint: boolean = false) => {
      if (!isHost) {
          sendToHost({ type: 'GUESS_LETTER', payload: { letter, playerId, isHint } });
          return;
      }
      
      setGameState(prev => {
          if (prev.status !== 'PLAYING') return prev;
          
          const currentPlayer = prev.players[prev.currentPlayerIndex];
          if (currentPlayer.id !== playerId) return prev;

          const newGuessed = [...prev.guessedLetters, letter];
          const isCorrect = prev.secretWord.includes(letter);
          const newWrong = isCorrect ? prev.wrongGuesses : prev.wrongGuesses + 1;
          
          let newPlayers = [...prev.players];
          const pIndex = newPlayers.findIndex(p => p.id === playerId);
          if (pIndex !== -1) {
              if (isHint) {
                  newPlayers[pIndex] = { ...newPlayers[pIndex], score: Math.max(0, newPlayers[pIndex].score - 50) };
              } else if (isCorrect) {
                  newPlayers[pIndex] = { ...newPlayers[pIndex], score: newPlayers[pIndex].score + 10 };
              }
          }

          let nextPlayerIndex = prev.currentPlayerIndex;
          if (!isCorrect) {
              nextPlayerIndex = (prev.currentPlayerIndex + 1) % prev.players.length;
              if (prev.players.length > 1 && prev.players[nextPlayerIndex].isHost) {
                  nextPlayerIndex = (nextPlayerIndex + 1) % prev.players.length;
              }
          }

          let status: GameStatus = prev.status;
          let winnerId = prev.winnerId;

          if (newWrong >= prev.config.maxWrongGuesses) {
              status = 'LEADERBOARD';
              winnerId = 'HANGMAN';
          } 
          else {
              const lettersInWord = prev.secretWord.split('').filter(char => {
                  const availableLetters = prev.config.wordLanguage === Language.AR ? LETTERS_AR : LETTERS_EN;
                  return availableLetters.includes(char);
              });
              
              const allGuessed = lettersInWord.every(c => newGuessed.includes(c));
              
              if (allGuessed && lettersInWord.length > 0) {
                  status = 'LEADERBOARD';
                  winnerId = playerId; 
                  if (pIndex !== -1) newPlayers[pIndex].score += 50;
              }
          }

          if (status === 'LEADERBOARD' && winnerId === 'HANGMAN') {
              const hostIdx = newPlayers.findIndex(p => p.isHost);
              if(hostIdx !== -1) newPlayers[hostIdx].score += 20;
          }

          if (status === 'LEADERBOARD' && winnerId !== 'HANGMAN') confetti();

          const newState = {
              ...prev,
              guessedLetters: newGuessed,
              wrongGuesses: newWrong,
              currentPlayerIndex: nextPlayerIndex,
              status,
              winnerId,
              players: newPlayers,
              lastInteraction: Date.now()
          };
          broadcast({ type: 'UPDATE_STATE', payload: newState });
          return newState;
      });
  };

  const useHint = () => {
      const alphabet = gameState.config.wordLanguage === Language.AR ? LETTERS_AR : LETTERS_EN;
      const wordLetters = gameState.secretWord.split('').filter(c => alphabet.includes(c));
      const unguessed = wordLetters.filter(c => !gameState.guessedLetters.includes(c));
      
      if (unguessed.length > 0) {
          const randomChar = unguessed[Math.floor(Math.random() * unguessed.length)];
          handleGuess(randomChar, peerId, true);
      }
  };

  // --------------------------------------------------------------------------
  // RENDER UI
  // --------------------------------------------------------------------------

  // 1. JOIN SCREEN
  if (!hasJoined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 max-w-xl mx-auto w-full">
        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-teal-500 mb-8 pop-in drop-shadow-lg text-center leading-tight">
          {t('game.hangman')}
        </h1>
        <Card className="w-full flex flex-col gap-6">
          <div>
            <label className="block text-white/50 mb-2 font-bold uppercase tracking-wider text-sm">{t('enterName')}</label>
            <Input placeholder="e.g. WordMaster" value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={15} />
          </div>
          {!showJoinInput && !autoJoinCode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <Button variant="primary" size="lg" disabled={!playerName} onClick={() => createGame(playerName)} className="w-full bg-teal-600 border-teal-800 hover:bg-teal-500">
                    {connectionStatus === 'CONNECTING' ? <Loader2 className="animate-spin w-6 h-6"/> : t('create')}
                </Button>
                <Button variant="glass" size="lg" disabled={!playerName} onClick={() => setShowJoinInput(true)} className="w-full">{t('join')}</Button>
              </div>
          ) : (
              <div className="flex flex-col gap-4 mt-2 animate-fade-in">
                <div>
                   <label className="block text-white/50 mb-2 font-bold uppercase tracking-wider text-sm">{t('enterGameId')}</label>
                   <Input placeholder="ABCD" value={joinGameCode} onChange={(e) => setJoinGameCode(e.target.value.toUpperCase())} maxLength={4} className="tracking-[0.5em] font-mono uppercase text-3xl" />
                </div>
                <div className="flex gap-3">
                    <Button className="flex-1 bg-green-500 border-green-700 hover:bg-green-400" size="lg" disabled={connectionStatus === 'CONNECTING' || joinGameCode.length < 4} onClick={() => joinGame(playerName, joinGameCode)}>
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
                <ArrowLeft className="rtl:rotate-180" size={20}/> Exit to Main Menu
            </Button>
            {isHost && (
                 <Button variant="secondary" size="sm" onClick={() => setShowInviteModal(true)}>
                     <UserPlus size={20}/> Invite Friends
                 </Button>
            )}
         </div>

         <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-teal-900/50 to-emerald-900/50">
               <h2 className="text-xl text-white/50 font-bold uppercase tracking-widest mb-4">Room Code</h2>
               <div className="relative group cursor-pointer active:scale-95 transition-transform" onClick={() => { navigator.clipboard.writeText(displayCode || joinGameCode); alert(t('copied')); }}>
                   <span className="font-black text-7xl md:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-teal-200 to-teal-500 tracking-wider drop-shadow-2xl font-mono">{displayCode || joinGameCode}</span>
                   <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"><Copy size={24} className="text-teal-400"/></div>
               </div>
            </Card>

            {isHost ? (
               <Card className="text-start bg-white/5">
                   <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                       <Settings className="text-teal-400" size={28} /> 
                       <span className="text-2xl font-bold">{t('settings.title')}</span>
                   </div>
                   <div className="space-y-6">
                       <div>
                           <label className="text-sm font-bold text-white/60 block mb-2">{t('hangman.difficulty')}</label>
                           <div className="flex gap-2 bg-black/20 p-2 rounded-xl">
                               <button 
                                   className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${gameState.config.maxWrongGuesses === 10 ? 'bg-teal-600 text-white shadow-lg' : 'text-white/40 hover:bg-white/5'}`}
                                   onClick={() => {
                                       const newState = { ...gameState, config: { ...gameState.config, maxWrongGuesses: 10 }};
                                       setGameState(newState);
                                       broadcast({ type: 'UPDATE_STATE', payload: newState });
                                   }}
                               >
                                   {t('hangman.easy')}
                               </button>
                               <button 
                                   className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${gameState.config.maxWrongGuesses === 6 ? 'bg-red-600 text-white shadow-lg' : 'text-white/40 hover:bg-white/5'}`}
                                   onClick={() => {
                                       const newState = { ...gameState, config: { ...gameState.config, maxWrongGuesses: 6 }};
                                       setGameState(newState);
                                       broadcast({ type: 'UPDATE_STATE', payload: newState });
                                   }}
                               >
                                   {t('hangman.hard')}
                               </button>
                           </div>
                       </div>
                       
                       <div>
                           <div className="flex justify-between items-center mb-2">
                               <label className="text-sm font-bold text-white/60">{t('settings.turnTimer')}</label>
                               <span className="text-orange-400 font-black text-xl">
                                   {gameState.config.turnDuration === 0 ? t('settings.off') : `${gameState.config.turnDuration}s`}
                               </span>
                           </div>
                           <input 
                              type="range" min="0" max="300" step="10"
                              value={gameState.config.turnDuration}
                              onChange={(e) => {
                                  const newState = { ...gameState, config: { ...gameState.config, turnDuration: parseInt(e.target.value) }};
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
                             <Loader2 size={40} className="text-teal-400" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold">{t('waiting')}</h3>
                            <p className="text-white/40">{t('waiting')}</p>
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
                <h3 className="text-white/50 uppercase text-sm font-bold tracking-widest flex items-center gap-2"><Users size={16}/> {t('players')}</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {gameState.players.map((p) => (
                    <div key={p.id} className="bg-white/10 rounded-2xl p-4 flex flex-col items-center pop-in border-2 border-white/5 relative overflow-hidden slide-up">
                        {p.isHost && <div className="absolute top-0 right-0 bg-yellow-500 text-yellow-950 text-[10px] font-black px-2 py-1 rounded-bl-lg uppercase tracking-wider z-10">Host</div>}
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-tr from-teal-400 to-emerald-600 mb-2 flex items-center justify-center font-black text-xl shadow-lg`}>{p.name.charAt(0).toUpperCase()}</div>
                        <span className="font-bold truncate w-full text-center text-sm">{p.name}</span>
                        <div className="mt-2 bg-black/30 px-3 py-1 rounded-lg text-xs font-mono font-bold text-teal-300">
                             {p.score} pts
                        </div>
                    </div>
                ))}
            </div>
         </div>
         {isHost && (
           <div className="sticky bottom-6 w-full max-w-md mx-auto">
               <Button variant="success" size="xl" className="w-full bg-emerald-500 border-emerald-700 hover:bg-emerald-400" onClick={startGameSetup}><Play fill="currentColor" size={28} /> {t('startGame')}</Button>
           </div>
         )}
         
         <FriendSystemModal 
            isOpen={showInviteModal} 
            onClose={() => setShowInviteModal(false)} 
            inviteMode={true} 
            currentGameInfo={{ type: 'hangman', code: displayCode || joinGameCode }}
         />
      </div>
    );
  }

  // 3. SETUP
  if (gameState.status === 'SETUP') {
      if (isHost) {
          return (
              <div className="flex flex-col items-center justify-center min-h-screen p-6 w-full">
                  <div className="absolute top-6 left-6">
                      <Button variant="glass" size="sm" onClick={backToLobby}>
                          <Home size={18}/> Lobby
                      </Button>
                  </div>
                  <h2 className="text-4xl font-black mb-8">{t('hangman.setWord')}</h2>
                  <Card className="w-full max-w-xl relative flex flex-col gap-4">
                      <div className="relative">
                        <Input 
                            placeholder={t('hangman.enterSecret')}
                            type={showSecret ? "text" : "password"}
                            value={secretInput}
                            onChange={(e) => setSecretInput(e.target.value)}
                            className="tracking-widest text-3xl pe-14"
                            maxLength={50}
                            autoFocus
                        />
                        <button 
                            className="absolute end-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                            onClick={() => setShowSecret(!showSecret)}
                        >
                            {showSecret ? <EyeOff /> : <Eye />}
                        </button>
                      </div>

                      <Input 
                        placeholder={t('hangman.categoryPlaceholder')}
                        value={categoryInput}
                        onChange={(e) => setCategoryInput(e.target.value)}
                        className="text-lg bg-white/5 border-white/10"
                        maxLength={20}
                      />

                      <div className="text-white/40 text-sm mb-2 text-center">
                          Min 2 letters. Symbols/Spaces will be auto-revealed.
                      </div>
                      <Button variant="primary" size="lg" className="w-full" disabled={secretInput.trim().length < 2} onClick={confirmSecretWord}>
                          Start Round
                      </Button>
                  </Card>
              </div>
          );
      } else {
          return (
              <div className="flex flex-col items-center justify-center min-h-screen p-6">
                  <div className="absolute top-6 left-6">
                      <Button variant="glass" size="sm" onClick={onExit}><Home size={18}/> Leave</Button>
                  </div>
                  <div className="bg-white/5 p-12 rounded-[3rem] flex flex-col items-center relative overflow-hidden pulse-glow">
                      <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/10 to-transparent animate-pulse"></div>
                      <Keyboard size={80} className="text-teal-400 mb-6 animate-bounce-subtle" strokeWidth={1.5}/>
                      <h2 className="text-3xl font-bold mb-2">{t('hangman.waitingForSetup')}</h2>
                      <p className="text-white/40">The host is thinking of a difficult word...</p>
                  </div>
              </div>
          );
      }
  }

  // 4. PLAYING & GAME OVER
  if (gameState.status === 'PLAYING' || gameState.status === 'LEADERBOARD') {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      const isMyTurn = currentPlayer?.id === peerId && gameState.status === 'PLAYING';
      const letters = gameState.config.wordLanguage === Language.AR ? LETTERS_AR : LETTERS_EN;
      
      const isWinner = gameState.status === 'LEADERBOARD' && gameState.winnerId !== 'HANGMAN';
      const isLoser = gameState.status === 'LEADERBOARD' && gameState.winnerId === 'HANGMAN';

      const timerPercent = gameState.config.turnDuration > 0 ? (timeLeft / gameState.config.turnDuration) * 100 : 100;

      return (
          <div className="flex flex-col min-h-screen p-4 md:p-8 max-w-6xl mx-auto w-full items-center">
               <div className="w-full flex justify-between items-center mb-4">
                  <Button variant="glass" size="sm" onClick={backToLobby}>
                      <Home size={18}/> {isHost ? "Lobby" : "Leave"}
                  </Button>
                  
                  <div className="bg-white/10 px-4 py-2 rounded-xl font-bold text-sm border border-white/5">
                      Your Score: <span className="text-yellow-400">{gameState.players.find(p=>p.id===peerId)?.score || 0}</span>
                  </div>
              </div>

              {/* CHALKBOARD AREA */}
              <div className="w-full bg-[#2d4035] rounded-[2rem] border-[12px] border-[#8b5a2b] shadow-2xl relative overflow-hidden mb-6 flex flex-col items-center p-6 md:p-10 min-h-[50vh]">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-felt.png')] opacity-30 pointer-events-none"></div>
                  
                  <div className="relative z-10 w-full flex flex-col items-center">
                      
                      {gameState.category && (
                          <div className="mb-6 flex items-center gap-2 bg-black/20 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10 slide-up">
                              <Tag size={16} className="text-yellow-400"/>
                              <span className="font-bold uppercase tracking-wider text-sm md:text-base text-yellow-100">{t('hangman.category')}: {gameState.category}</span>
                          </div>
                      )}

                      <div className="flex flex-col md:flex-row w-full h-full items-center justify-between gap-8 md:gap-16">
                          <div className="w-full md:w-1/3 flex justify-center h-[280px] md:h-[350px]">
                              {renderHangman(gameState.wrongGuesses, gameState.config.maxWrongGuesses, isWinner, isLoser)}
                          </div>

                          <div className="w-full md:w-2/3 flex flex-col items-center">
                               {/* ADDED DIR ATTRIBUTE FOR PROPER LETTER ORDERING */}
                               <div className="flex flex-wrap justify-center gap-x-2 gap-y-4 mb-8 w-full max-w-xl" dir={gameState.config.wordLanguage === 'ar' ? 'rtl' : 'ltr'}>
                                   {gameState.secretWord.split('').map((char, idx) => {
                                       const isLetter = letters.includes(char);
                                       const isGuessed = !isLetter || gameState.guessedLetters.includes(char) || gameState.status === 'LEADERBOARD';
                                       const isMissed = gameState.status === 'LEADERBOARD' && isLetter && !gameState.guessedLetters.includes(char);
                                       
                                       if (!isLetter && char === ' ') return <div key={idx} className="w-6 md:w-8"></div>;

                                       return (
                                           <div key={idx} className="flex flex-col items-center gap-1">
                                               <span className={`
                                                    font-[Fredoka] text-3xl md:text-5xl font-black border-b-4 border-white/40 min-w-[30px] md:min-w-[50px] text-center pb-2
                                                    ${!isLetter ? 'border-transparent' : ''}
                                                    ${isMissed ? 'text-red-400' : 'text-white'}
                                                    ${isWinner && isGuessed ? 'text-emerald-300' : ''}
                                               `}>
                                                   {isGuessed ? char : ''}
                                               </span>
                                           </div>
                                       );
                                   })}
                               </div>

                               {gameState.status === 'LEADERBOARD' && (
                                   <div className="mt-4 flex flex-col items-center animate-pop-in text-center">
                                       <div className={`text-4xl md:text-6xl font-black mb-2 drop-shadow-lg ${gameState.winnerId === 'HANGMAN' ? 'text-red-400' : 'text-emerald-400'}`}>
                                           {gameState.winnerId === 'HANGMAN' ? t('hangman.lost') : t('hangman.won')}
                                       </div>
                                       {gameState.winnerId !== 'HANGMAN' && (
                                           <div className="text-lg md:text-xl opacity-80 font-bold bg-white/10 px-4 py-1 rounded-full">
                                                Correct Guess by {gameState.players.find(p=>p.id===gameState.winnerId)?.name}
                                           </div>
                                       )}
                                       {isHost && (
                                           <Button variant="primary" size="md" className="mt-8 shadow-teal-900/40" onClick={startGameSetup}>
                                               <RotateCcw className="mr-2"/> Play Again
                                           </Button>
                                       )}
                                   </div>
                               )}
                          </div>
                      </div>
                  </div>
              </div>

              {gameState.status === 'PLAYING' && (
                <div className="w-full max-w-4xl flex flex-col gap-4 mb-10 slide-up">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className={`
                            flex-1 px-4 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-sm border transition-colors duration-500
                            ${isMyTurn ? 'bg-teal-500/20 border-teal-500 pulse-glow' : 'bg-white/10 border-white/10'}
                        `}>
                           <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center font-black text-lg shadow-lg shrink-0">
                               {currentPlayer.name.charAt(0)}
                           </div>
                           <div className="flex flex-col">
                               <span className="font-bold text-lg leading-tight">{isMyTurn ? "YOUR TURN" : currentPlayer.name}</span>
                               {gameState.config.turnDuration > 0 && (
                                   <div className="flex items-center gap-2 text-xs font-mono opacity-70">
                                       <Clock size={12}/> {Math.ceil(timeLeft)}s
                                   </div>
                               )}
                           </div>
                        </div>

                        <Button 
                            variant="secondary" 
                            size="sm" 
                            disabled={!isMyTurn}
                            onClick={useHint}
                            className={`shrink-0 ${!isMyTurn ? 'opacity-50 grayscale' : ''}`}
                        >
                            <Lightbulb size={20} className={isMyTurn ? "text-yellow-300" : ""}/> 
                            <span>{t('hangman.hint')}</span>
                        </Button>
                    </div>

                    {gameState.config.turnDuration > 0 && (
                       <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                           <div 
                               className={`h-full transition-all duration-200 ease-linear ${timerPercent < 30 ? 'bg-red-500' : 'bg-teal-400'}`}
                               style={{ width: `${timerPercent}%` }}
                           />
                       </div>
                    )}

                    <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5 md:gap-3">
                        {letters.map((l) => {
                            const isGuessed = gameState.guessedLetters.includes(l);
                            const isCorrect = gameState.secretWord.includes(l);
                            
                            let bgStyle = 'bg-white text-teal-900 border-teal-800 hover:bg-teal-50';
                            if (isGuessed) {
                                 if (isCorrect) bgStyle = 'bg-emerald-500 text-white border-emerald-700 opacity-50'; 
                                 else bgStyle = 'bg-red-500 text-white border-red-700 opacity-50'; 
                            } else if (!isMyTurn) {
                                 bgStyle = 'bg-white/20 text-white/40 border-black/20'; 
                            }

                            return (
                                <button
                                    key={l}
                                    disabled={isGuessed || !isMyTurn}
                                    onClick={() => handleGuess(l, peerId)}
                                    className={`
                                        aspect-square rounded-lg md:rounded-xl font-black text-lg md:text-2xl transition-all border-b-[3px] md:border-b-4 
                                        ${bgStyle}
                                        ${!isGuessed && isMyTurn ? 'active:translate-y-1 active:border-b-0 shadow-lg cursor-pointer transform hover:-translate-y-1' : 'cursor-default'}
                                    `}
                                >
                                    {l}
                                </button>
                            );
                        })}
                    </div>
                </div>
              )}
          </div>
      );
  }

  return <div>Unknown State</div>;
};

export default HangmanGame;
