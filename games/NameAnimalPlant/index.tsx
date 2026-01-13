
import React, { useEffect, useState, useRef } from 'react';
import { usePeer } from '../../hooks/usePeer';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import { Button, Card, Input, Badge } from '../../components/ui/GenericUI';
import { FriendSystemModal } from '../../components/ui/FriendSystem';
import { 
  NAPGameState, 
  Player, 
  NAPRoundAnswers, 
  NAPPlayerRoundData 
} from '../../types';
import { LETTERS_AR, LETTERS_EN, NAP_CATEGORIES } from '../../constants';
import { Copy, Play, Hand, Trophy, AlertTriangle, Settings, Timer, RefreshCcw, Wand2, Loader2, Users, ArrowRight, Dna, ArrowLeft, Plus, Trash2, UserPlus, Home } from 'lucide-react';
import confetti from 'canvas-confetti';

// INITIAL HELPER
const getEmptyAnswers = (categories: string[]): NAPRoundAnswers => {
    const answers: NAPRoundAnswers = {};
    categories.forEach(c => answers[c] = '');
    return answers;
};

// --- SUBCOMPONENT: SLOT MACHINE ---
const SlotMachineLetter = ({ 
    targetLetter, 
    isSpinning, 
    lang 
}: { 
    targetLetter: string; 
    isSpinning: boolean; 
    lang: string 
}) => {
    const [displayLetter, setDisplayLetter] = useState('?');
    const letters = lang === 'ar' ? LETTERS_AR : LETTERS_EN;

    useEffect(() => {
        if (isSpinning) {
            const interval = setInterval(() => {
                setDisplayLetter(letters[Math.floor(Math.random() * letters.length)]);
            }, 80);
            return () => clearInterval(interval);
        } else {
            setDisplayLetter(targetLetter);
        }
    }, [isSpinning, targetLetter, letters]);

    return (
        <div className={`
            relative w-20 h-20 md:w-28 md:h-28 rounded-2xl flex items-center justify-center 
            overflow-hidden shadow-xl border-4 border-white/20
            ${isSpinning ? 'bg-indigo-600' : 'bg-white text-indigo-950'}
        `}>
            {/* Reel Effect Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/20 pointer-events-none"></div>
            
            <span className={`
                font-black text-5xl md:text-7xl transition-all duration-200
                ${isSpinning ? 'blur-sm scale-75 opacity-70 animate-pulse' : 'blur-0 scale-100 opacity-100'}
            `}>
                {displayLetter}
            </span>
        </div>
    );
};


const NameAnimalPlantGame = ({ onExit, autoJoinCode }: { onExit: () => void, autoJoinCode?: string }) => {
  const { t, lang } = useLanguage();
  const { user, addScore } = useUser();
  const [playerName, setPlayerName] = useState(user?.name || '');
  const [hasJoined, setHasJoined] = useState(false);
  
  // UI States
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinGameCode, setJoinGameCode] = useState(autoJoinCode || '');
  const [showLetterPicker, setShowLetterPicker] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false); 
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Game Logic State
  const [gameState, setGameState] = useState<NAPGameState>({
    status: 'LOBBY',
    currentRound: 0,
    currentLetter: '',
    stopperId: null,
    players: [],
    roundData: {},
    config: {
      targetScore: 100,
      mode: 'FIRST_TO_STOP',
      timerSeconds: 60,
      letterSelection: 'AUTO',
      activeCategories: ['name', 'animal', 'plant', 'inanimate', 'country']
    }
  });

  // Local Player State
  const [myAnswers, setMyAnswers] = useState<NAPRoundAnswers>({});
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

  // Auto-Join Logic
  useEffect(() => {
      if (autoJoinCode && !hasJoined && connectionStatus === 'IDLE' && playerName) {
          joinGame(playerName, autoJoinCode);
      }
  }, [autoJoinCode, hasJoined, connectionStatus, playerName]);

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
            // Avoid adding duplicate players if they reconnect
            const exists = prev.players.find(p => p.id === newPlayer.id);
            if (exists) {
                // If they exist, ensure we send them the current state instantly anyway
                if (conn) sendTo(conn, { type: 'UPDATE_STATE', payload: prev });
                return prev; 
            }
            
            const newPlayers = [...prev.players, newPlayer];
            const newState = { ...prev, players: newPlayers };
            
            if (conn) {
                sendTo(conn, { type: 'UPDATE_STATE', payload: newState });
            }
            
            broadcast({ type: 'UPDATE_STATE', payload: newState });
            
            return newState;
          });
        }
        else if (data.type === 'SUBMIT_ANSWERS') {
           const { playerId, answers } = data.payload;
           setGameState(prev => {
             const newRoundData = { ...prev.roundData };
             
             const existing = newRoundData[playerId] || {
                playerId,
                answers: getEmptyAnswers(prev.config.activeCategories),
                scores: {},
                totalRoundScore: 0,
                isFinished: false
             };
             
             // Initialize scores if missing (important for dynamic cats)
             prev.config.activeCategories.forEach(c => {
                 if (existing.scores[c] === undefined) existing.scores[c] = 0;
             });

             newRoundData[playerId] = {
               ...existing,
               answers: answers,
               isFinished: true 
             };
             return { ...prev, roundData: newRoundData };
           });
        }
        else if (data.type === 'STOP_ROUND') {
          const { playerId, answers } = data.payload;
          handleRemoteStopRequest(playerId, answers);
        }
      }
      
      // CLIENT LOGIC
      if (!isHost) {
        if (data.type === 'UPDATE_STATE') {
          const newState = data.payload as NAPGameState;
          // Detect round start to trigger spin animation
          if (newState.status === 'PLAYING' && newState.currentRound !== gameState.currentRound) {
               triggerSpinEffect();
               // Initialize local answers
               setMyAnswers(getEmptyAnswers(newState.config.activeCategories));
          }
          // Detect game finish for scoring
          if (newState.status === 'LEADERBOARD' && gameState.status !== 'LEADERBOARD') {
              const myData = newState.players.find(p => p.id === peerId);
              const myPrevData = gameState.players.find(p => p.id === peerId);
              if (myData && myPrevData) {
                  const gained = myData.score - myPrevData.score;
                  if (gained > 0) addScore(gained);
              }
          }

          setGameState(newState);
        }
      }
    });
  }, [isHost, broadcast, gameState, sendTo, peerId]); // Added peerId dep

  // Handle connection success
  useEffect(() => {
    if (connectionStatus === 'CONNECTED' && !hasJoined) {
      setHasJoined(true);
      if (isHost) {
         setGameState(prev => {
             if (prev.players.find(p => p.isHost)) return prev;
             return {
                 ...prev,
                 players: [...prev.players, { id: peerId, name: playerName, isHost: true, score: 0 }]
             };
         });
      }
    }
  }, [connectionStatus, hasJoined, isHost, peerId, playerName]);

  // Client auto-submit when round stops
  useEffect(() => {
    if (!isHost && gameState.status === 'SCORING' && gameState.stopperId !== peerId) {
      sendToHost({
        type: 'SUBMIT_ANSWERS',
        payload: { playerId: peerId, answers: myAnswers }
      });
    }
  }, [gameState.status]);

  // Timer Logic
  useEffect(() => {
    if (gameState.status === 'PLAYING' && gameState.config.mode === 'TIMER' && gameState.startTime && !isSpinning) {
      const interval = setInterval(() => {
        const elapsed = (Date.now() - (gameState.startTime || 0)) / 1000;
        const remaining = Math.max(0, gameState.config.timerSeconds - elapsed);
        setTimeLeft(remaining);

        if (remaining <= 0) {
           clearInterval(interval);
           if (isHost) handleStopRound('TIMER');
        }
      }, 500);
      timerRef.current = interval;
      return () => clearInterval(interval);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [gameState.status, gameState.config.mode, gameState.startTime, isHost, isSpinning]);


  // --------------------------------------------------------------------------
  // GAME ACTIONS
  // --------------------------------------------------------------------------

  const backToLobby = () => {
      if (isHost) {
          setGameState(prev => {
              const newState: NAPGameState = {
                  ...prev,
                  status: 'LOBBY',
                  currentRound: 0,
                  stopperId: null,
                  roundData: {},
                  startTime: undefined
                  // Keep players and config
              };
              broadcast({ type: 'UPDATE_STATE', payload: newState });
              return newState;
          });
      } else {
          onExit();
      }
  };

  const triggerSpinEffect = () => {
      setIsSpinning(true);
      setTimeout(() => {
          setIsSpinning(false);
      }, 2000); // Spin for 2 seconds
  };

  const handleRemoteStopRequest = (playerId: string, answers: any) => {
    setGameState(prev => {
      if (prev.status !== 'PLAYING') return prev;
      
      const existing = prev.roundData[playerId] || {
          playerId,
          answers: getEmptyAnswers(prev.config.activeCategories),
          scores: {},
          totalRoundScore: 0,
          isFinished: false
      };
      
       // Initialize scores if missing
       prev.config.activeCategories.forEach(c => {
            if (existing.scores[c] === undefined) existing.scores[c] = 0;
       });

      const newState: NAPGameState = {
        ...prev,
        status: 'SCORING',
        stopperId: playerId,
        roundData: {
          ...prev.roundData,
          [playerId]: {
            ...existing,
            answers: answers,
            isFinished: true
          }
        }
      };
      broadcast({ type: 'UPDATE_STATE', payload: newState });
      return newState;
    });
  };

  const prepareRound = () => {
    if (gameState.config.letterSelection === 'MANUAL') {
        setShowLetterPicker(true);
    } else {
        startNewRound(null);
    }
  };

  const startNewRound = (forcedLetter: string | null) => {
    setShowLetterPicker(false);
    const letters = lang === 'ar' ? LETTERS_AR : LETTERS_EN;
    const letter = forcedLetter || letters[Math.floor(Math.random() * letters.length)];
    
    // Reset round data
    const freshRoundData: Record<string, NAPPlayerRoundData> = {};
    gameState.players.forEach(p => {
      const scores: Record<string, number> = {};
      gameState.config.activeCategories.forEach(c => scores[c] = 0);

      freshRoundData[p.id] = {
        playerId: p.id,
        answers: getEmptyAnswers(gameState.config.activeCategories),
        scores,
        totalRoundScore: 0,
        isFinished: false
      };
    });

    // Determine start time (add 2s delay for spin animation)
    const startTime = Date.now() + 2000;

    const newState: NAPGameState = {
      ...gameState,
      status: 'PLAYING',
      currentRound: gameState.currentRound + 1,
      currentLetter: letter,
      stopperId: null,
      roundData: freshRoundData,
      startTime: startTime
    };
    
    setGameState(newState);
    broadcast({ type: 'UPDATE_STATE', payload: newState });
    
    setMyAnswers(getEmptyAnswers(gameState.config.activeCategories));
    triggerSpinEffect();
  };

  const handleStopRound = (source: string = 'USER') => {
    if (gameState.status !== 'PLAYING') return;
    
    // If Host
    if (isHost) {
      setGameState(prev => {
        const newState: NAPGameState = {
          ...prev,
          status: 'SCORING',
          stopperId: source === 'TIMER' ? 'TIMER' : peerId,
          roundData: {
            ...prev.roundData,
            [peerId]: {
              ...prev.roundData[peerId],
              answers: myAnswers,
              isFinished: true
            }
          }
        };
        broadcast({ type: 'UPDATE_STATE', payload: newState });
        return newState;
      });
    } else {
      sendToHost({
        type: 'STOP_ROUND',
        payload: { playerId: peerId, answers: myAnswers }
      });
    }
  };

  const resumeRound = () => {
      if(!isHost) return;
      setGameState(prev => {
          const newState: NAPGameState = {
              ...prev,
              status: 'PLAYING',
              stopperId: null
          };
          broadcast({ type: 'UPDATE_STATE', payload: newState });
          return newState;
      });
  };

  const autoScore = () => {
      if(!isHost) return;

      const cats = gameState.config.activeCategories;
      const newRoundData = { ...gameState.roundData };
      const playerIds = gameState.players.map(p => p.id);

      // Pre-process: normalize answers
      const playerAnswers: Record<string, Record<string, string>> = {};
      playerIds.forEach(pid => {
          const raw = newRoundData[pid]?.answers || getEmptyAnswers(cats);
          playerAnswers[pid] = {};
          cats.forEach(c => {
              playerAnswers[pid][c] = (raw[c] || '').trim().toLowerCase();
          });
      });

      cats.forEach(cat => {
          // Count occurrences
          const valueCounts: Record<string, number> = {};
          playerIds.forEach(pid => {
              const val = playerAnswers[pid][cat];
              if(val) {
                  valueCounts[val] = (valueCounts[val] || 0) + 1;
              }
          });

          // Assign scores
          playerIds.forEach(pid => {
              const val = playerAnswers[pid][cat];
              const pData = newRoundData[pid];
              if(!pData) return;

              let score = 0;
              if (!val) {
                  score = 0; // Empty
              } else if (!val.startsWith(gameState.currentLetter.toLowerCase()) && !val.startsWith(gameState.currentLetter)) {
                  score = 0; 
              } else {
                  if (valueCounts[val] > 1) score = 5; // Duplicate
                  else score = 10; // Unique
              }
              
              pData.scores[cat] = score;
          });
      });

      // Recalculate totals
      playerIds.forEach(pid => {
          const pData = newRoundData[pid];
          if(pData) {
            pData.totalRoundScore = Object.values(pData.scores).reduce((a: number, b: number) => a + b, 0);
          }
      });

      const newState = { ...gameState, roundData: newRoundData };
      setGameState(newState);
      broadcast({ type: 'UPDATE_STATE', payload: newState });
  };

  const updateHostScore = (targetPlayerId: string, category: string) => {
    if (!isHost) return;
    
    setGameState(prev => {
      const pData = prev.roundData[targetPlayerId];
      if (!pData) return prev; 
      
      const currentScore = pData.scores[category] || 0;
      let nextScore = 0;
      if (currentScore === 0) nextScore = 10;
      else if (currentScore === 10) nextScore = 5;
      else nextScore = 0;

      const newScores = { ...pData.scores, [category]: nextScore };
      const total = Object.values(newScores).reduce((a: number, b: number) => a + b, 0);

      const newRoundData = {
        ...prev.roundData,
        [targetPlayerId]: {
          ...pData,
          scores: newScores,
          totalRoundScore: total
        }
      };

      const newState = { ...prev, roundData: newRoundData };
      broadcast({ type: 'UPDATE_STATE', payload: newState });
      return newState;
    });
  };

  const finalizeRound = () => {
    if (!isHost) return;
    setGameState(prev => {
      // Calculate Round Gains
      const updatedPlayers = prev.players.map(p => ({
        ...p,
        score: p.score + (prev.roundData[p.id]?.totalRoundScore || 0)
      }));

      // Host updates their own global score
      const hostP = updatedPlayers.find(p => p.isHost);
      const hostGain = prev.roundData[peerId]?.totalRoundScore || 0;
      if(hostGain > 0) addScore(hostGain);

      const newState = {
        ...prev,
        players: updatedPlayers,
        status: 'LEADERBOARD' as const
      };
      broadcast({ type: 'UPDATE_STATE', payload: newState });
      return newState;
    });
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
  };

  // --------------------------------------------------------------------------
  // RENDER HELPERS
  // --------------------------------------------------------------------------

  // 1. SETUP SCREEN
  if (!hasJoined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 max-w-xl mx-auto w-full">
         <div className="absolute top-6 left-6">
            <Button variant="glass" size="sm" onClick={onExit}>
                <Home className="mr-2" size={18}/> {t('common.leave')}
            </Button>
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400 mb-8 pop-in drop-shadow-lg text-center leading-tight">
          {t('game.nap')}
        </h1>
        
        <Card className="w-full flex flex-col gap-6">
          <div>
            <label className="block text-white/50 mb-2 font-bold uppercase tracking-wider text-sm">{t('enterName')}</label>
            <Input 
              placeholder={t('enterName')} 
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
                  onClick={() => {
                    createGame(playerName);
                  }}
                  className="w-full"
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
                        className="flex-1"
                        variant="secondary"
                        size="lg"
                        disabled={connectionStatus === 'CONNECTING' || joinGameCode.length < 4}
                        onClick={() => {
                           joinGame(playerName, joinGameCode);
                        }}
                    >
                        {connectionStatus === 'CONNECTING' ? <Loader2 className="animate-spin w-6 h-6" /> : t('connect')}
                    </Button>
                    <Button variant="glass" size="lg" className="px-6" onClick={() => setShowJoinInput(false)}>
                        <ArrowLeft className="rtl:rotate-180" size={24}/>
                    </Button>
                </div>
                
              </div>
          )}
        </Card>
      </div>
    );
  }

  // 2. LOBBY SCREEN
  if (gameState.status === 'LOBBY') {
    return (
      <div className="flex flex-col items-center pt-8 md:pt-16 min-h-screen p-4 max-w-5xl mx-auto w-full">
         <div className="w-full flex justify-between mb-6">
            <Button variant="glass" size="sm" onClick={onExit}>
                <ArrowLeft className="mr-2 rtl:rotate-180" size={20}/> {t('common.lobby')}
            </Button>
            {isHost && (
                <Button variant="secondary" size="sm" onClick={() => setShowInviteModal(true)}>
                    <UserPlus className="mr-2" size={20}/> {t('common.invite')}
                </Button>
            )}
         </div>

         {/* Lobby Header */}
         <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-violet-900/50 to-indigo-900/50">
               <h2 className="text-xl text-white/50 font-bold uppercase tracking-widest mb-4">{t('enterGameId')}</h2>
               <div 
                   className="relative group cursor-pointer active:scale-95 transition-transform"
                   onClick={() => {
                       navigator.clipboard.writeText(displayCode || joinGameCode);
                       alert(t('copied'));
                   }}
               >
                   <span className="font-black text-7xl md:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-500 tracking-wider drop-shadow-2xl font-mono">
                       {displayCode || joinGameCode}
                   </span>
                   <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Copy size={24} className="text-yellow-400"/>
                   </div>
               </div>
            </Card>

            {isHost ? (
               <Card className="text-start bg-white/5">
                   <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                       <Settings className="text-pink-400" size={28} /> 
                       <span className="text-2xl font-bold">{t('settings.title')}</span>
                   </div>
                   
                   <div className="space-y-6 max-h-[400px] overflow-y-auto bubble-scrollbar pr-2">
                       {/* CATEGORY SELECTION */}
                       <div className="bg-black/20 p-4 rounded-2xl">
                          <label className="text-sm font-bold text-white/60 mb-3 flex items-center gap-2">
                              <Dna size={16} /> {t('settings.activeCats')}
                          </label>
                          <div className="flex flex-wrap gap-2 mb-4">
                              {NAP_CATEGORIES.map(cat => {
                                  const isActive = gameState.config.activeCategories.includes(cat.id);
                                  return (
                                      <button
                                          key={cat.id}
                                          onClick={() => {
                                              let newCats = [...gameState.config.activeCategories];
                                              if (isActive) {
                                                  if (newCats.length > 1) newCats = newCats.filter(c => c !== cat.id);
                                              } else {
                                                  newCats.push(cat.id);
                                              }
                                              const newConfig = { ...gameState.config, activeCategories: newCats };
                                              setGameState(prev => ({ ...prev, config: newConfig }));
                                              broadcast({ type: 'UPDATE_STATE', payload: { ...gameState, config: newConfig } });
                                          }}
                                          className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all border-2 ${
                                              isActive 
                                              ? 'bg-pink-500 border-pink-400 text-white shadow-lg scale-105' 
                                              : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'
                                          }`}
                                      >
                                          {t(`categories.${cat.id}`) || cat.id}
                                      </button>
                                  )
                              })}
                              
                              {/* Custom Categories */}
                              {gameState.config.activeCategories
                                .filter(c => !NAP_CATEGORIES.some(nc => nc.id === c))
                                .map(customCat => (
                                   <button
                                      key={customCat}
                                      onClick={() => {
                                          const newCats = gameState.config.activeCategories.filter(c => c !== customCat);
                                          const newConfig = { ...gameState.config, activeCategories: newCats };
                                          setGameState(prev => ({ ...prev, config: newConfig }));
                                          broadcast({ type: 'UPDATE_STATE', payload: { ...gameState, config: newConfig } });
                                      }}
                                      className="px-3 py-1.5 rounded-lg text-sm font-bold transition-all border-2 bg-purple-500 border-purple-400 text-white shadow-lg scale-105 flex items-center gap-2"
                                  >
                                      {customCat} <Trash2 size={12}/>
                                  </button>
                                ))
                              }
                          </div>
                          
                          <div className="flex gap-2">
                             <input 
                                className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:bg-white/20"
                                placeholder="Add custom..."
                                value={newCategoryInput}
                                onChange={e => setNewCategoryInput(e.target.value)}
                                onKeyDown={e => {
                                    if(e.key === 'Enter' && newCategoryInput.trim()) {
                                        const newCat = newCategoryInput.trim();
                                        if(!gameState.config.activeCategories.includes(newCat)) {
                                            const newCats = [...gameState.config.activeCategories, newCat];
                                            const newConfig = { ...gameState.config, activeCategories: newCats };
                                            setGameState(prev => ({ ...prev, config: newConfig }));
                                            broadcast({ type: 'UPDATE_STATE', payload: { ...gameState, config: newConfig } });
                                            setNewCategoryInput('');
                                        }
                                    }
                                }}
                             />
                             <Button size="sm" variant="secondary" onClick={() => {
                                if(newCategoryInput.trim()) {
                                    const newCat = newCategoryInput.trim();
                                    if(!gameState.config.activeCategories.includes(newCat)) {
                                        const newCats = [...gameState.config.activeCategories, newCat];
                                        const newConfig = { ...gameState.config, activeCategories: newCats };
                                        setGameState(prev => ({ ...prev, config: newConfig }));
                                        broadcast({ type: 'UPDATE_STATE', payload: { ...gameState, config: newConfig } });
                                        setNewCategoryInput('');
                                    }
                                }
                             }}>
                                <Plus size={16}/>
                             </Button>
                          </div>
                       </div>

                       {/* MODE */}
                       <div>
                           <label className="text-sm font-bold text-white/60 block mb-2">{t('settings.mode')}</label>
                           <div className="flex gap-2 p-1.5 bg-black/20 rounded-xl">
                               <button 
                                   className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm md:text-base transition-all ${gameState.config.mode === 'FIRST_TO_STOP' ? 'bg-violet-600 text-white shadow-lg' : 'text-white/40 hover:bg-white/5'}`}
                                   onClick={() => {
                                       const newConfig = { ...gameState.config, mode: 'FIRST_TO_STOP' as const };
                                       setGameState(prev => ({ ...prev, config: newConfig }));
                                       broadcast({ type: 'UPDATE_STATE', payload: { ...gameState, config: newConfig } });
                                   }}
                               >
                                   {t('settings.modeStop')}
                               </button>
                               <button 
                                   className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm md:text-base transition-all ${gameState.config.mode === 'TIMER' ? 'bg-violet-600 text-white shadow-lg' : 'text-white/40 hover:bg-white/5'}`}
                                   onClick={() => {
                                       const newConfig = { ...gameState.config, mode: 'TIMER' as const };
                                       setGameState(prev => ({ ...prev, config: newConfig }));
                                       broadcast({ type: 'UPDATE_STATE', payload: { ...gameState, config: newConfig } });
                                   }}
                               >
                                   {t('settings.modeTimer')}
                               </button>
                           </div>
                       </div>

                       {/* TIMER SLIDER */}
                       {gameState.config.mode === 'TIMER' && (
                           <div className="animate-fade-in bg-violet-900/20 p-4 rounded-xl border border-violet-500/20">
                                <div className="flex justify-between mb-2">
                                  <label className="text-sm font-bold text-violet-300">{t('settings.timerDuration')}</label>
                                  <span className="font-mono font-bold text-xl">{gameState.config.timerSeconds}s</span>
                                </div>
                                <input 
                                   type="range" min="10" max="600" step="10" 
                                   value={gameState.config.timerSeconds}
                                   onChange={(e) => {
                                       const newConfig = { ...gameState.config, timerSeconds: parseInt(e.target.value) };
                                       setGameState(prev => ({ ...prev, config: newConfig }));
                                       broadcast({ type: 'UPDATE_STATE', payload: { ...gameState, config: newConfig } });
                                   }}
                                   className="w-full h-4 bg-black/30 rounded-lg appearance-none cursor-pointer accent-violet-400"
                                />
                           </div>
                       )}

                       {/* LETTER SELECTION */}
                       <div>
                           <label className="text-sm font-bold text-white/60 block mb-2">{t('settings.letterSelect')}</label>
                           <div className="flex gap-2 p-1.5 bg-black/20 rounded-xl">
                                <button 
                                   className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm md:text-base transition-all ${gameState.config.letterSelection === 'AUTO' ? 'bg-violet-600 text-white shadow-lg' : 'text-white/40 hover:bg-white/5'}`}
                                   onClick={() => {
                                       const newConfig = { ...gameState.config, letterSelection: 'AUTO' as const };
                                       setGameState(prev => ({ ...prev, config: newConfig }));
                                       broadcast({ type: 'UPDATE_STATE', payload: { ...gameState, config: newConfig } });
                                   }}
                               >
                                   {t('settings.auto')}
                               </button>
                               <button 
                                   className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm md:text-base transition-all ${gameState.config.letterSelection === 'MANUAL' ? 'bg-violet-600 text-white shadow-lg' : 'text-white/40 hover:bg-white/5'}`}
                                   onClick={() => {
                                       const newConfig = { ...gameState.config, letterSelection: 'MANUAL' as const };
                                       setGameState(prev => ({ ...prev, config: newConfig }));
                                       broadcast({ type: 'UPDATE_STATE', payload: { ...gameState, config: newConfig } });
                                   }}
                               >
                                   {t('settings.manual')}
                               </button>
                           </div>
                       </div>
                   </div>
               </Card>
            ) : (
                <Card className="flex items-center justify-center bg-white/5">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center animate-spin-slow">
                             <Loader2 size={40} className="text-pink-400" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold">{t('common.waiting')}</h3>
                            <p className="text-white/40">Host is configuring the game...</p>
                        </div>
                    </div>
                </Card>
            )}
         </div>

         {/* Player Grid */}
         <div className="w-full mb-10">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-white/50 uppercase text-sm font-bold tracking-widest flex items-center gap-2">
                    <Users size={16}/> {t('players')}
                </h3>
                <span className="bg-white/10 px-3 py-1 rounded-full text-sm font-bold">{gameState.players.length}</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {gameState.players.map(p => (
                <div key={p.id} className="bg-white/10 rounded-2xl p-4 flex flex-col items-center pop-in border-2 border-white/5 hover:border-white/20 transition-colors relative overflow-hidden group">
                    {p.isHost && (
                        <div className="absolute top-0 right-0 bg-yellow-500 text-yellow-950 text-[10px] font-black px-2 py-1 rounded-bl-lg uppercase tracking-wider z-10">
                            {t('common.host')}
                        </div>
                    )}
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 mb-2 flex items-center justify-center font-black text-xl md:text-3xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold truncate w-full text-center text-sm md:text-base">{p.name}</span>
                </div>
                ))}
            </div>
         </div>

         {/* Start Button */}
         {isHost && (
           <div className="sticky bottom-6 w-full max-w-md mx-auto">
               <Button variant="success" size="xl" className="w-full shadow-emerald-900/50 animate-bounce-subtle" onClick={prepareRound}>
                 <Play fill="currentColor" size={28} /> {t('startGame')}
               </Button>
           </div>
         )}

         {/* LETTER PICKER MODAL */}
         {showLetterPicker && (
            <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
                <div className="bg-[#1e1b4b] border-2 border-white/20 rounded-[2rem] p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <h3 className="text-3xl font-black mb-6 text-center text-white">{t('settings.letterSelect')}</h3>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                        {(lang === 'ar' ? LETTERS_AR : LETTERS_EN).map(l => (
                            <button 
                                key={l}
                                onClick={() => startNewRound(l)}
                                className="aspect-square bg-white/10 hover:bg-pink-500 hover:scale-105 rounded-2xl font-black text-2xl md:text-3xl transition flex items-center justify-center border-b-4 border-black/20 active:border-b-0 active:translate-y-1"
                            >
                                {l}
                            </button>
                        ))}
                    </div>
                    <Button variant="glass" className="w-full mt-8" onClick={() => setShowLetterPicker(false)}>Cancel</Button>
                </div>
            </div>
         )}
         
         <FriendSystemModal 
            isOpen={showInviteModal} 
            onClose={() => setShowInviteModal(false)} 
            inviteMode={true} 
            currentGameInfo={{ type: 'nap', code: displayCode || joinGameCode }}
         />
      </div>
    );
  }

  // 3. GAME ROUND
  if (gameState.status === 'PLAYING') {
    const isTimerMode = gameState.config.mode === 'TIMER';
    const percentTime = isTimerMode ? (timeLeft / gameState.config.timerSeconds) * 100 : 100;

    return (
      <div className="flex flex-col min-h-screen p-4 md:p-6 max-w-7xl mx-auto w-full">
        {/* Top Bar */}
        <div className="flex justify-between items-start mb-6">
           <div className="flex flex-col">
             <div className="mb-2">
                 <Button variant="glass" size="sm" onClick={backToLobby}>
                     <Home className="mr-2" size={20}/> {isHost ? t('common.lobby') : t('common.leave')}
                 </Button>
             </div>
             <span className="text-white/60 text-sm md:text-base font-bold uppercase tracking-wider mb-1">{t('round')} {gameState.currentRound}</span>
             <div className="flex items-center gap-4">
                 
                 <SlotMachineLetter 
                    targetLetter={gameState.currentLetter} 
                    isSpinning={isSpinning} 
                    lang={lang} 
                 />

                 <div className="hidden md:block">
                     <div className="text-white/40 font-medium">{t('letter')}</div>
                     <div className="text-2xl font-bold">{isSpinning ? t('spinning') : gameState.currentLetter}</div>
                 </div>
             </div>
           </div>
           
           <div className="flex flex-col items-end gap-2">
                {isTimerMode ? (
                    <div className={`flex items-center gap-3 text-3xl md:text-5xl font-mono font-black ${timeLeft < 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                        <Timer size={32} strokeWidth={3} className={timeLeft < 10 ? 'text-red-500' : ''} />
                        {Math.ceil(timeLeft)}s
                    </div>
                ) : (
                    <Button 
                        variant="danger" 
                        size="lg" 
                        disabled={isSpinning}
                        onClick={() => handleStopRound('USER')} 
                        className={`shadow-red-900/50 ${isSpinning ? 'opacity-50 grayscale' : ''}`}
                    >
                        <Hand className="mr-2" strokeWidth={3} /> {t('stop')}
                    </Button>
                )}
           </div>
        </div>

        {/* Timer Bar Visual */}
        {isTimerMode && (
            <div className="w-full h-4 bg-white/10 rounded-full mb-8 overflow-hidden border border-white/5">
                <div 
                    className={`h-full transition-all duration-500 ease-linear ${timeLeft < 10 ? 'bg-red-500' : 'bg-gradient-to-r from-green-400 to-emerald-500'}`}
                    style={{ width: `${percentTime}%` }}
                />
            </div>
        )}

        {/* Categories Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
          {gameState.config.activeCategories.map((cat, idx) => (
             <div key={cat} className={`relative group pop-in`} style={{ animationDelay: `${idx * 50}ms` }}>
                <label className="text-sm md:text-base uppercase font-black ml-4 mb-2 block text-pink-300 tracking-wide flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/70">{idx + 1}</span>
                  {t(`categories.${cat}`) || cat}
                </label>
                <Input 
                  disabled={isSpinning}
                  value={myAnswers[cat] || ''}
                  onChange={(e) => {
                    setMyAnswers(prev => ({...prev, [cat]: e.target.value}));
                  }}
                  className="pl-6 h-16 md:h-20 text-2xl md:text-3xl bg-white/5 focus:bg-white/10"
                  placeholder={isSpinning ? '...' : `${gameState.currentLetter}...`}
                  autoComplete="off"
                />
             </div>
          ))}
        </div>
      </div>
    );
  }

  // 4. SCORING REVIEW
  if (gameState.status === 'SCORING') {
    const categories = gameState.config.activeCategories;
    
    return (
      <div className="flex flex-col h-screen p-2 md:p-6 max-w-[95rem] mx-auto w-full overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center py-4 px-2 gap-4 mb-2">
          <div className="flex items-center gap-4">
              <Button variant="glass" size="sm" onClick={backToLobby}>
                  <Home className="mr-2" size={20}/> {isHost ? t('common.lobby') : t('common.leave')}
              </Button>
              <h2 className="text-2xl md:text-3xl font-black">{t('status.review')}</h2>
              <div className="bg-white/10 px-4 py-2 rounded-xl text-xl font-bold border border-white/10">
                  {t('letter')}: <span className="text-yellow-400">{gameState.currentLetter}</span>
              </div>
          </div>
          
          {gameState.stopperId === 'TIMER' ? (
              <Badge color="bg-orange-500 text-lg py-2 px-4">{t('timerEnd')}</Badge>
          ) : (
             gameState.stopperId && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 animate-pulse">
                    <Hand size={20} />
                    {gameState.players.find(p => p.id === gameState.stopperId)?.name} {t('someoneStopped')}
                </div>
             )
          )}
        </div>

        {/* Scoring Table */}
        <div className="flex-1 overflow-hidden bg-black/20 rounded-[2rem] border border-white/10 shadow-2xl flex flex-col relative">
           <div className="overflow-auto bubble-scrollbar flex-1 relative">
               <table className="w-full border-separate border-spacing-0">
                 <thead className="bg-[#151238] sticky top-0 z-20">
                   <tr>
                     <th className="sticky start-0 z-30 bg-[#151238] text-start text-white/50 p-4 md:p-6 border-b border-white/10 min-w-[150px] shadow-[2px_0_10px_rgba(0,0,0,0.3)]">{t('players')}</th>
                     {categories.map(cat => (
                       <th key={cat} className="text-start text-pink-300 p-4 md:p-6 min-w-[180px] md:min-w-[220px] border-b border-white/10 text-lg font-bold uppercase">{t(`categories.${cat}`) || cat}</th>
                     ))}
                     <th className="p-4 md:p-6 text-white/50 border-b border-white/10 min-w-[100px] text-center font-bold">Total</th>
                   </tr>
                 </thead>
                 <tbody>
                   {gameState.players.map((p, idx) => {
                     const pData = gameState.roundData[p.id] || { 
                       playerId: p.id,
                       answers: getEmptyAnswers(categories), 
                       scores: {},
                       totalRoundScore: 0,
                       isFinished: false
                     };
                     const isStopper = p.id === gameState.stopperId;
                     const rowBg = idx % 2 === 0 ? 'bg-white/5' : 'bg-transparent';

                     return (
                       <tr key={p.id} className={`${rowBg} hover:bg-white/10 transition-colors`}>
                         <td className={`sticky start-0 z-10 ${rowBg} p-4 md:p-6 font-bold border-b border-white/5 shadow-[2px_0_10px_rgba(0,0,0,0.3)] min-w-[150px]`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm border border-white/20">
                                    {p.name.charAt(0)}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-lg">{p.name}</span>
                                    {isStopper && <span className="text-[10px] text-red-400 font-bold uppercase bg-red-900/30 px-2 py-0.5 rounded w-fit">Stopper</span>}
                                </div>
                            </div>
                         </td>
                         {categories.map(cat => {
                           const score = pData.scores[cat] || 0;
                           let cellColor = "text-white/40 line-through decoration-2 decoration-white/20"; // Invalid/Empty
                           let bgColor = "bg-transparent";
                           
                           if (score === 10) {
                               cellColor = "text-emerald-300";
                               bgColor = "bg-emerald-500/10";
                           }
                           if (score === 5) {
                               cellColor = "text-yellow-300";
                               bgColor = "bg-yellow-500/10";
                           }
                           if (score === 0 && pData.answers[cat]) {
                               cellColor = "text-red-300 line-through decoration-red-500";
                               bgColor = "bg-red-500/10";
                           }

                           return (
                             <td 
                                key={cat} 
                                className={`p-2 border-b border-white/5 relative group cursor-pointer`}
                                onClick={() => updateHostScore(p.id, cat)}
                             >
                                <div className={`h-full w-full rounded-xl p-3 md:p-4 transition-all duration-200 ${bgColor} hover:bg-white/20 flex flex-col justify-between min-h-[80px]`}>
                                    <div className={`text-lg md:text-xl font-medium truncate ${cellColor}`}>
                                        {pData.answers[cat] || <span className="text-white/10 italic">-</span>}
                                    </div>
                                    
                                    {/* Score Indicator Badge */}
                                    <div className="flex justify-between items-end mt-2">
                                        {isHost && (
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] uppercase font-bold text-white/50 bg-black/40 px-2 py-1 rounded">
                                                Tap
                                            </div>
                                        )}
                                        <div className={`ml-auto font-black text-sm px-2 py-1 rounded-md ${
                                            score === 10 ? 'bg-emerald-500 text-emerald-950' : 
                                            score === 5 ? 'bg-yellow-500 text-yellow-950' : 
                                            'bg-white/10 text-white/50'
                                        }`}>
                                            +{score}
                                        </div>
                                    </div>
                                </div>
                             </td>
                           );
                         })}
                         <td className="p-4 md:p-6 border-b border-white/5 text-center bg-white/5 min-w-[100px]">
                            <span className="font-black text-2xl md:text-3xl bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                                {pData.totalRoundScore || 0}
                            </span>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
           </div>
        </div>

        {/* Action Bar */}
        {isHost && (
          <div className="p-4 md:p-6 mt-4 bg-white/5 rounded-3xl border border-white/10 flex flex-col md:flex-row gap-4 justify-between items-center shadow-xl">
            <div className="flex gap-4 w-full md:w-auto">
                <Button variant="secondary" size="md" onClick={resumeRound} className="flex-1 md:flex-none">
                    <RefreshCcw size={20} className="mr-2"/> Resume
                </Button>
                <Button variant="primary" size="md" onClick={autoScore} className="flex-1 md:flex-none">
                    <Wand2 size={20} className="mr-2"/> Auto
                </Button>
            </div>
            <Button variant="success" size="lg" onClick={finalizeRound} className="w-full md:w-auto shadow-emerald-900/40">
              {t('status.review')} <ArrowRight size={24} className="ml-2 rtl:rotate-180" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // 5. LEADERBOARD
  if (gameState.status === 'LEADERBOARD') {
    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
    
    return (
      <div className="flex flex-col items-center pt-10 md:pt-20 min-h-screen p-6 max-w-3xl mx-auto w-full">
         <div className="relative mb-8">
            <div className="absolute -inset-10 bg-yellow-500/20 blur-3xl rounded-full animate-pulse"></div>
            <Trophy size={100} className="text-yellow-400 relative z-10 pop-in drop-shadow-2xl" strokeWidth={1.5} />
         </div>
         
         <h2 className="text-4xl md:text-6xl font-black mb-12 text-center text-white drop-shadow-lg uppercase tracking-tight">{t('fruit.place')}</h2>

         <div className="w-full flex flex-col gap-4">
            {sortedPlayers.map((p, idx) => {
                let rankStyles = "bg-white/10 border-white/10";
                let textStyles = "text-white";
                let rankIcon = <span className="text-white/20 font-black text-2xl">#{idx + 1}</span>;

                if (idx === 0) {
                    rankStyles = "bg-gradient-to-r from-yellow-600 to-yellow-500 border-yellow-400 shadow-yellow-900/50 shadow-xl scale-105 z-10";
                    textStyles = "text-yellow-950";
                    rankIcon = <Trophy size={32} className="text-yellow-900" fill="currentColor" />;
                }

                return (
                  <div key={p.id} className={`relative rounded-3xl p-6 md:p-8 flex items-center justify-between border-b-8 transition-all hover:translate-x-2 ${rankStyles}`}>
                     <div className="flex items-center gap-6">
                        <div className="w-12 flex justify-center">{rankIcon}</div>
                        <div className="flex flex-col">
                          <span className={`font-black text-2xl md:text-3xl ${textStyles}`}>{p.name}</span>
                          <span className={`text-sm font-bold opacity-60 ${textStyles}`}>
                              +{gameState.roundData[p.id]?.totalRoundScore}
                          </span>
                        </div>
                     </div>
                     <div className={`text-4xl md:text-5xl font-black ${textStyles}`}>{p.score}</div>
                  </div>
                );
            })}
         </div>

         <div className="mt-12 w-full pb-10">
            {isHost ? (
               <div className="flex flex-col md:flex-row gap-4 justify-center">
                 <Button variant="glass" size="lg" onClick={backToLobby}>{t('common.lobby')}</Button>
                 <Button variant="primary" size="xl" onClick={prepareRound} className="shadow-violet-900/50">
                    Next <ArrowRight size={28} className="ml-2 rtl:rotate-180"/>
                 </Button>
               </div>
            ) : (
               <div className="text-center p-6 bg-white/5 rounded-3xl animate-pulse">
                   <h3 className="text-2xl font-bold mb-2">{t('common.waiting')}</h3>
                   <Button variant="glass" size="sm" onClick={onExit} className="mt-4">{t('common.leave')}</Button>
               </div>
            )}
         </div>
      </div>
    );
  }

  return <div>Unknown State</div>;
};

export default NameAnimalPlantGame;
