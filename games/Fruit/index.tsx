
import React, { useEffect, useState } from 'react';
import { usePeer } from '../../hooks/usePeer';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import { Button, Card, Input, Badge } from '../../components/ui/GenericUI';
import { FruitGameState, Player, FruitCard, FruitDeckType } from '../../types';
import { FRUITS, DARES } from '../../constants';
import { Copy, Users, Play, Settings, Loader2, Home, Hand, Trophy, RotateCcw, Zap, Eye, EyeOff, Sparkles, Ghost, Skull, Type, Shuffle, Plus, Trash2, Keyboard, AlertCircle, ArrowLeft, Siren, X, UserPlus } from 'lucide-react';
import { FriendSystemModal } from '../../components/ui/FriendSystem';
import confetti from 'canvas-confetti';

const FruitGame = ({ onExit, autoJoinCode }: { onExit: () => void, autoJoinCode?: string }) => {
  const { t, lang } = useLanguage();
  const { user } = useUser();
  const [playerName, setPlayerName] = useState(user?.name || '');
  const [hasJoined, setHasJoined] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinGameCode, setJoinGameCode] = useState(autoJoinCode || '');
  const [showInviteModal, setShowInviteModal] = useState(false);

  // UI Local State for Host Settings
  const [customItemInput, setCustomItemInput] = useState('');

  // Game State
  const [gameState, setGameState] = useState<FruitGameState>({
    status: 'LOBBY',
    players: [],
    hands: {},
    selectedCards: {},
    slamOrder: [],
    winnerId: null,
    loserId: null,
    fouls: {},
    config: {
      winCondition: 'CLASSIC',
      deckType: 'CLASSIC',
      customItems: [],
      mysteryMode: false,
      wildcards: false,
      bluffingAllowed: false,
    },
    lastInteraction: 0
  });

  // Local Gameplay State
  const [localSelection, setLocalSelection] = useState<number | null>(null);
  const [peekedCardIndex, setPeekedCardIndex] = useState<number | null>(null);
  const [bluffCooldown, setBluffCooldown] = useState(false);
  const [localBluffActive, setLocalBluffActive] = useState(false);

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
  // GAME UTILS
  // --------------------------------------------------------------------------
  
  const generateConfusingStrings = (count: number): string[] => {
      const charSets = [
          ['b', 'd', 'p', 'q'],
          ['I', 'l', '1', '|'],
          ['O', '0', 'Q', 'D'],
          ['m', 'n', 'r', 'u'],
          ['S', '5', '2', 'Z']
      ];
      const set = charSets[Math.floor(Math.random() * charSets.length)];
      const items: Set<string> = new Set();
      
      while(items.size < count) {
          let str = '';
          for(let i=0; i<5; i++) {
              str += set[Math.floor(Math.random() * set.length)];
          }
          items.add(str);
      }
      return Array.from(items);
  };

  const generateDeck = (playerCount: number) => {
      let items: string[] = [];

      // 1. Determine Item Pool
      if (gameState.config.deckType === 'CLASSIC') {
          // Use Extended Fruit/Emoji list
          items = [...FRUITS];
          if (playerCount > items.length) {
              const extraNeeded = playerCount - items.length;
              for(let i=0; i<extraNeeded; i++) {
                  items.push(`TYPE-${i+1}`);
              }
          }
          items = items.slice(0, playerCount);
      } else if (gameState.config.deckType === 'CONFUSION') {
          items = generateConfusingStrings(playerCount);
      } else if (gameState.config.deckType === 'CUSTOM') {
          items = [...gameState.config.customItems];
          if (items.length < playerCount) {
              const needed = playerCount - items.length;
              items = [...items, ...FRUITS.slice(0, needed)];
              while(items.length < playerCount) {
                   items.push(`ITEM-${items.length + 1}`);
              }
          }
          items = items.slice(0, playerCount);
      }

      // 2. Create Deck (4 copies of each item)
      let deck: FruitCard[] = [];
      items.forEach(item => {
          for(let i=0; i<4; i++) {
              deck.push({ id: `${item}-${i}-${Date.now()}`, type: item });
          }
      });

      // 3. Add Wildcards
      if (gameState.config.wildcards) {
          deck.pop(); 
          deck.pop();
          deck.push({ id: 'WILD-1', type: 'GOLD', isWild: true });
          deck.push({ id: 'WILD-2', type: 'GOLD', isWild: true });
      }

      // Shuffle
      return deck.sort(() => Math.random() - 0.5);
  };

  const checkWinCondition = (hand: FruitCard[]) => {
      if (!hand || hand.length !== 4) return false;
      
      const counts: Record<string, number> = {};
      let wildCount = 0;

      hand.forEach(c => {
          if (c.isWild) wildCount++;
          else counts[c.type] = (counts[c.type] || 0) + 1;
      });

      if (gameState.config.winCondition === 'CLASSIC') {
          const maxTypeCount = Math.max(0, ...Object.values(counts));
          return (maxTypeCount + wildCount) >= 4;
      }

      if (gameState.config.winCondition === 'PAIRS') {
          const types = Object.keys(counts);
          if (wildCount >= 2) return true;
          if (wildCount === 1) {
              const hasPair = types.some(t => counts[t] >= 2);
              return hasPair;
          }
          if (wildCount === 0) {
              const pairs = types.filter(t => counts[t] >= 2).length;
              return pairs >= 2;
          }
      }

      return false;
  };

  // --------------------------------------------------------------------------
  // NETWORK & LISTENERS
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
              else if (data.type === 'SELECT_CARD') {
                  handleCardSelection(data.payload.playerId, data.payload.cardIndex);
              }
              else if (data.type === 'SLAM_HAND') {
                  handleSlam(data.payload.playerId);
              }
              else if (data.type === 'BLUFF') {
                  handleBluff(data.payload.playerId);
              }
          }
          
          if (!isHost) {
              if (data.type === 'UPDATE_STATE') {
                  const newState = data.payload;
                  if (newState.bluffActive && !gameState.bluffActive) {
                      setLocalBluffActive(true);
                      setTimeout(() => setLocalBluffActive(false), 500);
                  }
                  setGameState(newState);
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

  useEffect(() => {
      if (Object.keys(gameState.selectedCards).length === 0) {
          setLocalSelection(null);
          if (gameState.config.mysteryMode) setPeekedCardIndex(null);
      }
  }, [gameState.selectedCards, gameState.config.mysteryMode]);

  // --------------------------------------------------------------------------
  // GAME LOGIC (HOST)
  // --------------------------------------------------------------------------

  const startGame = () => {
      if (!isHost) return;
      const playerCount = gameState.players.length;
      if (playerCount < 2) return; 
      
      const deck = generateDeck(playerCount);
      const hands: Record<string, FruitCard[]> = {};
      
      gameState.players.forEach((p, idx) => {
          hands[p.id] = deck.slice(idx * 4, (idx + 1) * 4);
      });

      const newState: FruitGameState = {
          ...gameState,
          status: 'PLAYING',
          hands,
          selectedCards: {},
          slamOrder: [],
          winnerId: null,
          loserId: null,
          fouls: {},
          bluffActive: false,
          lastInteraction: Date.now()
      };
      setGameState(newState);
      broadcast({ type: 'UPDATE_STATE', payload: newState });
  };

  const handleCardSelection = (playerId: string, cardIndex: number) => {
      setGameState(prev => {
          if (prev.status !== 'PLAYING') return prev;
          
          const newSelections = { ...prev.selectedCards, [playerId]: cardIndex };
          
          // Check if everyone has selected
          if (Object.keys(newSelections).length === prev.players.length) {
              // SWAP PHASE
              const newHands = { ...prev.hands };
              const pendingReceives: Record<string, FruitCard> = {};
              
              // 1. Determine who gets what
              prev.players.forEach((p, idx) => {
                  const nextIdx = (idx + 1) % prev.players.length;
                  const nextPlayer = prev.players[nextIdx];
                  const cardIdx = newSelections[p.id];
                  pendingReceives[nextPlayer.id] = prev.hands[p.id][cardIdx];
              });

              // 2. Apply swaps
              prev.players.forEach(p => {
                  const cardIdx = newSelections[p.id];
                  const myHand = [...prev.hands[p.id]];
                  myHand.splice(cardIdx, 1); 
                  myHand.push(pendingReceives[p.id]); // React Key change will trigger animation
                  newHands[p.id] = myHand;
              });

              const nextState = { ...prev, hands: newHands, selectedCards: {} };
              broadcast({ type: 'UPDATE_STATE', payload: nextState });
              return nextState;
          }

          const nextState = { ...prev, selectedCards: newSelections };
          broadcast({ type: 'UPDATE_STATE', payload: nextState });
          return nextState;
      });
  };

  const handleBluff = (playerId: string) => {
      if (!gameState.config.bluffingAllowed) return;

      setGameState(prev => {
          const newState = { ...prev, bluffActive: true };
          setTimeout(() => {
              setGameState(curr => ({...curr, bluffActive: false}));
              broadcast({ type: 'UPDATE_STATE', payload: {...newState, bluffActive: false} });
          }, 500);
          
          broadcast({ type: 'UPDATE_STATE', payload: newState });
          return newState;
      });
  };

  // --- FIXED SLAM LOGIC ---
  const handleSlam = (playerId: string) => {
      setGameState(prev => {
          if (prev.status === 'RESULTS') return prev;
          if (prev.slamOrder.includes(playerId)) return prev;

          // LOGIC:
          // 1. If this is the FIRST slam of the round, check their hand.
          //    - If valid: They are winner, start CHAIN REACTION mode.
          //    - If invalid: FALSE ALARM. Game Over immediately.
          // 2. If this is NOT the first slam (Chain Reaction mode):
          //    - Do NOT check hand. Just add to list. Last one loses.

          const isFirstSlam = prev.slamOrder.length === 0;

          if (isFirstSlam) {
              const playerHand = prev.hands[playerId];
              const hasWin = checkWinCondition(playerHand);

              if (!hasWin) {
                  // FALSE ALARM!
                  const newState: FruitGameState = {
                      ...prev,
                      status: 'RESULTS',
                      slamOrder: [playerId], // Only this person slammed
                      winnerId: null, // No winner
                      loserId: playerId // This person lost due to false alarm
                  };
                  broadcast({ type: 'UPDATE_STATE', payload: newState });
                  return newState;
              } else {
                  // VALID FIRST SLAM - START CHAIN REACTION
                  const newOrder = [playerId];
                  
                  // If playing with 2 people, this instantly ends the game technically
                  // But usually we wait for the loser to slam (or fail to slam)
                  // For simplicity: if 2 players, the other one is auto-loser?
                  // No, let's let them slam to finish the reaction
                  
                  let newStatus: FruitGameState['status'] = 'SLAMMING';
                  let loserId = prev.loserId;
                  
                  // Edge case: 1 player mode (testing)
                  if (prev.players.length === 1) {
                      newStatus = 'RESULTS';
                      loserId = null;
                      confetti();
                  }

                  const newState: FruitGameState = {
                      ...prev,
                      status: newStatus,
                      slamOrder: newOrder,
                      winnerId: playerId,
                      loserId: null // Loser determined when everyone slams
                  };
                  broadcast({ type: 'UPDATE_STATE', payload: newState });
                  return newState;
              }
          } else {
              // CHAIN REACTION MODE
              // Just add to list. Don't check hand.
              const newOrder = [...prev.slamOrder, playerId];
              let newStatus: FruitGameState['status'] = prev.status;
              let loserId = prev.loserId;

              // Check if everyone has slammed
              if (newOrder.length === prev.players.length) {
                  newStatus = 'RESULTS';
                  loserId = playerId; // The last person to slam is the loser
                  confetti();
              }

              const newState: FruitGameState = {
                  ...prev,
                  slamOrder: newOrder,
                  status: newStatus,
                  loserId: loserId
              };
              broadcast({ type: 'UPDATE_STATE', payload: newState });
              return newState;
          }
      });
  };

  // --------------------------------------------------------------------------
  // CLIENT ACTIONS
  // --------------------------------------------------------------------------

  const selectCard = (index: number) => {
      if (localSelection !== null) return;
      setLocalSelection(index);
      const msg = { type: 'SELECT_CARD', payload: { playerId: peerId, cardIndex: index } };
      isHost ? handleCardSelection(peerId, index) : sendToHost(msg);
  };

  const slamHand = () => {
      const msg = { type: 'SLAM_HAND', payload: { playerId: peerId } };
      isHost ? handleSlam(peerId) : sendToHost(msg);
  };

  const activateBluff = () => {
      if (bluffCooldown || !gameState.config.bluffingAllowed) return;
      setBluffCooldown(true);
      setTimeout(() => setBluffCooldown(false), 5000); 
      
      const msg = { type: 'BLUFF', payload: { playerId: peerId } };
      isHost ? handleBluff(peerId) : sendToHost(msg);
  };

  // --------------------------------------------------------------------------
  // UI RENDERERS
  // --------------------------------------------------------------------------

  // 1. SETUP
  if (!hasJoined) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen p-6 max-w-xl mx-auto w-full">
               <div className="absolute top-6 left-6">
                  <Button variant="glass" size="sm" onClick={onExit}>
                      <Home className="mr-2" size={18}/> Exit
                  </Button>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 mb-8 pop-in drop-shadow-lg text-center leading-tight">
                  {t('game.fruit')}
              </h1>
              
              <Card className="w-full flex flex-col gap-6">
                  <div>
                    <label className="block text-white/50 mb-2 font-bold uppercase tracking-wider text-sm">{t('enterName')}</label>
                    <Input placeholder={t('enterName')} value={playerName} onChange={e=>setPlayerName(e.target.value)} maxLength={15} />
                  </div>
                  
                  {!showJoinInput && !autoJoinCode ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <Button variant="primary" size="lg" onClick={() => createGame(playerName)} disabled={!playerName} className="w-full bg-orange-500 border-orange-700 hover:bg-orange-400">
                            {connectionStatus === 'CONNECTING' ? <Loader2 className="animate-spin w-6 h-6"/> : t('create')}
                        </Button>
                        <Button variant="glass" size="lg" onClick={() => setShowJoinInput(true)} disabled={!playerName} className="w-full">{t('join')}</Button>
                     </div>
                  ) : (
                      <div className="flex flex-col gap-4 mt-2 animate-fade-in">
                          <div>
                            <label className="block text-white/50 mb-2 font-bold uppercase tracking-wider text-sm">{t('enterGameId')}</label>
                            <Input placeholder="ABCD" value={joinGameCode} onChange={e=>setJoinGameCode(e.target.value.toUpperCase())} maxLength={4} className="tracking-[0.5em] font-mono uppercase text-3xl" />
                          </div>
                          <div className="flex gap-3">
                            <Button variant="secondary" size="lg" className="flex-1" onClick={() => joinGame(playerName, joinGameCode)}>
                                {connectionStatus === 'CONNECTING' ? <Loader2 className="animate-spin w-6 h-6"/> : t('connect')}
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
          </div>
      );
  }

  // 2. LOBBY
  if (gameState.status === 'LOBBY') {
      return (
          <div className="flex flex-col items-center pt-8 md:pt-16 min-h-screen p-4 max-w-4xl mx-auto w-full">
              <div className="w-full flex justify-between mb-6">
                  <Button variant="glass" size="sm" onClick={onExit}>
                      <ArrowLeft className="mr-2" size={20}/> Exit to Main Menu
                  </Button>
                  {isHost && (
                    <Button variant="secondary" size="sm" onClick={() => setShowInviteModal(true)}>
                        <UserPlus className="mr-2" size={20}/> Invite Friends
                    </Button>
                  )}
              </div>

              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <Card className="flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-orange-900/50 to-red-900/50">
                      <h2 className="text-xl text-white/50 font-bold uppercase tracking-widest mb-4">Room Code</h2>
                      <div className="relative group cursor-pointer active:scale-95 transition-transform" onClick={() => { navigator.clipboard.writeText(displayCode || joinGameCode); alert(t('copied')); }}>
                          <span className="font-black text-7xl md:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-orange-200 to-orange-500 tracking-wider drop-shadow-2xl font-mono">{displayCode || joinGameCode}</span>
                          <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"><Copy size={24} className="text-orange-400"/></div>
                      </div>
                  </Card>

                  {isHost ? (
                      <Card className="text-left bg-white/5 overflow-hidden flex flex-col max-h-[500px]">
                          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10 shrink-0">
                              <Settings className="text-orange-400" size={28} /> 
                              <span className="text-2xl font-bold">{t('settings.title')}</span>
                          </div>
                          
                          <div className="space-y-6 overflow-y-auto bubble-scrollbar pr-2 flex-1">
                              <div>
                                  <label className="font-bold text-white/60 mb-2 block text-sm uppercase tracking-wider">Deck Style</label>
                                  <div className="grid grid-cols-3 gap-2 bg-black/20 p-2 rounded-xl">
                                      {['CLASSIC', 'CONFUSION', 'CUSTOM'].map((type) => (
                                          <button 
                                            key={type}
                                            onClick={() => {
                                                const cfg = {...gameState.config, deckType: type as any};
                                                setGameState(s => ({...s, config: cfg}));
                                                broadcast({type:'UPDATE_STATE', payload: {...gameState, config: cfg}});
                                            }}
                                            className={`flex flex-col items-center p-2 rounded-lg transition-all ${gameState.config.deckType === type ? 'bg-orange-500 text-white shadow-lg' : 'text-white/40 hover:bg-white/5'}`}
                                          >
                                              <span className="text-2xl mb-1">{type === 'CLASSIC' ? '🍎' : type === 'CONFUSION' ? '😵‍💫' : '✏️'}</span>
                                              <span className="text-[10px] font-bold">{type}</span>
                                          </button>
                                      ))}
                                  </div>
                              </div>

                              {gameState.config.deckType === 'CUSTOM' && (
                                  <div className="animate-fade-in bg-orange-500/10 p-4 rounded-xl border border-orange-500/20">
                                      <div className="flex gap-2 mb-3">
                                          <input 
                                            value={customItemInput}
                                            onChange={(e) => setCustomItemInput(e.target.value)}
                                            placeholder="Add word..."
                                            className="flex-1 bg-black/20 rounded-lg px-3 py-2 text-sm focus:outline-none border border-white/10 focus:border-orange-400"
                                            onKeyDown={(e) => {
                                                if(e.key === 'Enter' && customItemInput.trim()) {
                                                    const newItems = [...gameState.config.customItems, customItemInput.trim()];
                                                    const cfg = {...gameState.config, customItems: newItems};
                                                    setGameState(s => ({...s, config: cfg}));
                                                    broadcast({type:'UPDATE_STATE', payload: {...gameState, config: cfg}});
                                                    setCustomItemInput('');
                                                }
                                            }}
                                          />
                                          <button 
                                            onClick={() => {
                                                if(customItemInput.trim()) {
                                                    const newItems = [...gameState.config.customItems, customItemInput.trim()];
                                                    const cfg = {...gameState.config, customItems: newItems};
                                                    setGameState(s => ({...s, config: cfg}));
                                                    broadcast({type:'UPDATE_STATE', payload: {...gameState, config: cfg}});
                                                    setCustomItemInput('');
                                                }
                                            }}
                                            className="bg-orange-500 hover:bg-orange-400 p-2 rounded-lg text-white"
                                          >
                                              <Plus size={18}/>
                                          </button>
                                      </div>
                                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto bubble-scrollbar">
                                          {gameState.config.customItems.map((item, idx) => (
                                              <span key={idx} className="bg-white/10 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-2">
                                                  {item}
                                                  <button onClick={() => {
                                                      const newItems = gameState.config.customItems.filter((_, i) => i !== idx);
                                                      const cfg = {...gameState.config, customItems: newItems};
                                                      setGameState(s => ({...s, config: cfg}));
                                                      broadcast({type:'UPDATE_STATE', payload: {...gameState, config: cfg}});
                                                  }}><Trash2 size={12} className="text-white/50 hover:text-red-400"/></button>
                                              </span>
                                          ))}
                                          {gameState.config.customItems.length === 0 && <span className="text-white/30 text-xs italic">No items yet. Add at least {gameState.players.length}.</span>}
                                      </div>
                                  </div>
                              )}
                              
                              <div className="h-px bg-white/10 my-4" />
                              
                              <div className="grid grid-cols-1 gap-3">
                                  {['mysteryMode', 'wildcards', 'bluffingAllowed'].map((key) => (
                                      <div key={key} className="flex items-center justify-between">
                                          <label className="font-bold text-white/60 flex items-center gap-2 text-sm">
                                            {key === 'mysteryMode' && <><Ghost size={16}/> {t('fruit.settings.mystery')}</>}
                                            {key === 'wildcards' && <><Sparkles size={16}/> {t('fruit.settings.wild')}</>}
                                            {key === 'bluffingAllowed' && <><Zap size={16}/> Bluffing</>}
                                          </label>
                                          <div 
                                            className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors ${(gameState.config as any)[key] ? 'bg-green-500' : 'bg-white/20'}`}
                                            onClick={() => {
                                                const val = !(gameState.config as any)[key];
                                                const cfg = {...gameState.config, [key]: val};
                                                setGameState(s => ({...s, config: cfg}));
                                                broadcast({type:'UPDATE_STATE', payload: {...gameState, config: cfg}});
                                            }}
                                          >
                                              <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${(gameState.config as any)[key] ? 'translate-x-5' : 'translate-x-0'}`} />
                                          </div>
                                      </div>
                                  ))}
                              </div>

                              <div className="h-px bg-white/10 my-4" />
                              
                              <div className="flex items-center justify-between">
                                  <label className="font-bold text-white/60 text-sm">{t('fruit.settings.win')}</label>
                                  <div className="flex gap-1 bg-black/20 p-1 rounded-lg">
                                      {['CLASSIC', 'PAIRS'].map((mode) => (
                                          <button 
                                            key={mode}
                                            onClick={() => {
                                                const cfg = {...gameState.config, winCondition: mode as any};
                                                setGameState(s => ({...s, config: cfg}));
                                                broadcast({type:'UPDATE_STATE', payload: {...gameState, config: cfg}});
                                            }}
                                            className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${gameState.config.winCondition === mode ? 'bg-orange-500 text-white' : 'text-white/40'}`}
                                          >
                                              {t(`fruit.settings.${mode.toLowerCase()}`) || mode}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      </Card>
                  ) : (
                      <Card className="flex items-center justify-center bg-white/5">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center animate-spin-slow">
                                <Loader2 size={40} className="text-orange-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold">{t('waiting')}</h3>
                                <p className="text-white/40">Host is configuring the game...</p>
                            </div>
                        </div>
                      </Card>
                  )}
              </div>

              <div className="w-full mb-10">
                  <div className="flex items-center justify-between mb-4 px-2">
                      <h3 className="text-white/50 uppercase text-sm font-bold tracking-widest flex items-center gap-2"><Users size={16}/> {t('players')} ({gameState.players.length})</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {gameState.players.map(p => (
                          <div key={p.id} className="bg-white/10 rounded-2xl p-4 flex flex-col items-center border-2 border-white/5 relative slide-up">
                              {p.isHost && <div className="absolute top-2 right-2 text-yellow-500"><Settings size={16}/></div>}
                              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-orange-400 to-red-500 mb-2 flex items-center justify-center text-2xl shadow-lg">
                                  {p.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-bold text-sm md:text-base truncate w-full text-center">{p.name}</span>
                          </div>
                      ))}
                  </div>
              </div>

              {isHost && (
                  <div className="sticky bottom-6 w-full max-w-md mx-auto">
                      <Button variant="success" size="xl" onClick={startGame} disabled={gameState.players.length < 2} className="w-full bg-green-500 border-green-700 hover:bg-green-400 shadow-green-500/30">
                          <Play fill="currentColor" className="mr-2"/> {t('startGame')}
                      </Button>
                      {gameState.config.deckType === 'CUSTOM' && gameState.config.customItems.length < gameState.players.length && (
                          <div className="text-center text-red-400 text-xs mt-2 font-bold animate-pulse">
                              <AlertCircle size={12} className="inline mr-1"/>
                              Not enough custom items. Fallback emojis will be used.
                          </div>
                      )}
                  </div>
              )}
              
              <FriendSystemModal 
                  isOpen={showInviteModal} 
                  onClose={() => setShowInviteModal(false)} 
                  inviteMode={true} 
                  currentGameInfo={{ type: 'fruit', code: displayCode || joinGameCode }}
               />
          </div>
      );
  }

  // 3. PLAYING
  if (gameState.status === 'PLAYING' || gameState.status === 'SLAMMING') {
      const myHand = gameState.hands[peerId] || [];
      const hasWin = checkWinCondition(myHand);
      const amISlamming = gameState.slamOrder.includes(peerId);
      const isSlamPhase = gameState.status === 'SLAMMING';
      
      const showBluffEffect = localBluffActive || gameState.bluffActive;

      const getFontSize = (text: string) => {
          if (gameState.config.deckType === 'CLASSIC' || gameState.config.deckType === 'CONFUSION') {
               return text.length > 2 ? 'text-4xl' : 'text-5xl md:text-7xl';
          }
          if (text.length > 8) return 'text-xl';
          if (text.length > 5) return 'text-2xl';
          return 'text-4xl';
      };

      return (
          <div className="flex flex-col min-h-screen p-4 md:p-8 max-w-6xl mx-auto w-full items-center relative transition-colors duration-100" style={{backgroundColor: showBluffEffect ? '#eab308' : ''}}>
               
               {isSlamPhase && (
                   <div className="absolute inset-0 z-0 bg-red-600/10 animate-pulse pointer-events-none rounded-[3rem]"></div>
               )}

               <div className="w-full flex justify-between items-center mb-6 z-10">
                  <Button variant="glass" size="sm" onClick={() => { if(confirm("Quit?")) onExit() }}>
                      <Home className="mr-2" size={18}/> Quit
                  </Button>
                  <div className="flex gap-2">
                       {gameState.config.bluffingAllowed && (
                           <Button 
                             variant="secondary" 
                             size="sm" 
                             disabled={bluffCooldown || isSlamPhase}
                             onClick={activateBluff}
                             className="shadow-orange-900/40"
                           >
                               <Zap size={16} className={bluffCooldown ? 'opacity-30' : 'fill-white'} /> {t('fruit.bluff')}
                           </Button>
                       )}
                  </div>
              </div>

              {/* Opponents */}
              <div className="w-full overflow-x-auto pb-4 mb-auto z-10 bubble-scrollbar">
                  <div className="flex justify-center gap-4 min-w-max px-4">
                      {gameState.players.filter(p => p.id !== peerId).map(p => {
                          const hasSelected = gameState.selectedCards[p.id] !== undefined;
                          const hasSlammed = gameState.slamOrder.includes(p.id);

                          return (
                            <div key={p.id} className={`flex flex-col items-center transition-all ${hasSlammed ? 'scale-90 opacity-50' : ''}`}>
                                <div className={`
                                    w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center font-bold text-xl mb-2 border-4 transition-all shrink-0
                                    ${hasSelected ? 'border-green-400 bg-green-900 text-green-100 scale-110' : 'border-white/10 bg-white/10'}
                                    ${hasSlammed ? 'border-red-500 bg-red-900' : ''}
                                `}>
                                    {p.name.charAt(0)}
                                </div>
                                <span className="text-xs font-bold opacity-60 truncate w-16 text-center">{p.name}</span>
                                {hasSlammed && <span className="text-red-400 font-black text-xs uppercase animate-bounce">SLAM!</span>}
                            </div>
                          );
                      })}
                  </div>
              </div>
              
              {/* SLAM BUTTON OVERLAY */}
              {(hasWin || isSlamPhase || showBluffEffect) && !amISlamming && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                      <button 
                        onClick={slamHand}
                        className="w-full max-w-sm aspect-square rounded-full bg-red-600 border-[12px] border-red-800 shadow-[0_0_100px_rgba(220,38,38,0.6)] flex flex-col items-center justify-center text-white transform active:scale-90 transition-transform hover:scale-105 group cursor-pointer pulse-glow"
                      >
                          <Hand size={100} strokeWidth={3} className="mb-4 group-hover:animate-bounce"/>
                          <span className="text-4xl md:text-6xl font-black uppercase tracking-tighter drop-shadow-lg">
                              {isSlamPhase ? t('fruit.slamNow') : t('fruit.slam')}
                          </span>
                      </button>
                  </div>
              )}
              
              {!hasWin && !isSlamPhase && !amISlamming && (
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20">
                       <button onClick={slamHand} className="bg-red-900/50 hover:bg-red-600 text-white p-4 rounded-full border-4 border-red-500/50 active:scale-90 transition-all">
                           <Hand size={24} />
                       </button>
                   </div>
              )}

              {/* Waiting Indicator */}
              {localSelection !== null && !isSlamPhase && (
                  <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                      <div className="bg-black/80 text-white px-8 py-4 rounded-full font-bold text-xl backdrop-blur-md animate-pulse flex items-center gap-3">
                          <Loader2 className="animate-spin"/> {t('fruit.waitingOthers')}
                      </div>
                  </div>
              )}

              {/* My Hand */}
              <div className="mt-auto z-10 flex flex-col items-center pb-8 w-full">
                  <div className="text-orange-200 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                       {localSelection === null ? t('fruit.selectToPass') : "Selected"}
                  </div>
                  <div className="flex justify-center gap-2 md:gap-4 w-full max-w-2xl px-2">
                      {myHand.map((card, idx) => {
                          const isHidden = gameState.config.mysteryMode && peekedCardIndex !== idx;

                          return (
                            <div 
                                key={card.id} // Important for Animation! React treats different key as new element
                                onClick={() => {
                                    if(gameState.config.mysteryMode) setPeekedCardIndex(idx);
                                    else selectCard(idx);
                                }}
                                onMouseEnter={() => { if(gameState.config.mysteryMode) setPeekedCardIndex(idx); }}
                                onMouseLeave={() => { if(gameState.config.mysteryMode) setPeekedCardIndex(null); }}
                                className={`
                                    relative group cursor-pointer w-full max-w-[120px] aspect-[3/4] rounded-2xl border-b-8 transition-all duration-300 transform flex flex-col items-center justify-center card-enter
                                    ${localSelection === idx 
                                        ? 'bg-orange-500 border-orange-700 -translate-y-6 shadow-2xl scale-110 z-20' 
                                        : card.isWild ? 'bg-yellow-400 border-yellow-600 hover:-translate-y-2' : 'bg-white border-white/20 hover:-translate-y-2'
                                    }
                                    ${localSelection !== null && localSelection !== idx ? 'opacity-50 blur-[1px] scale-95' : 'opacity-100'}
                                `}
                            >
                                <div className={`absolute inset-0 flex items-center justify-center select-none font-black p-2 text-center break-words leading-tight ${getFontSize(card.type)}`}>
                                    {isHidden ? (
                                        <span className="text-4xl text-black/10">?</span> 
                                    ) : (
                                        card.isWild ? '🌟' : card.type
                                    )}
                                </div>
                                
                                {!isHidden && (
                                    <>
                                        <div className="absolute top-2 left-3 text-[8px] md:text-[10px] font-bold opacity-30 text-black uppercase">{card.isWild ? 'WILD' : (gameState.config.deckType === 'CLASSIC' ? '' : 'ITEM')}</div>
                                    </>
                                )}
                                
                                {gameState.config.mysteryMode && isHidden && (
                                    <div className="absolute inset-0 bg-slate-800 rounded-xl flex items-center justify-center">
                                         <EyeOff className="text-white/20" size={32}/>
                                    </div>
                                )}
                            </div>
                          );
                      })}
                  </div>
                  {gameState.config.mysteryMode && localSelection === null && peekedCardIndex !== null && (
                      <Button variant="primary" size="sm" className="mt-4" onClick={() => selectCard(peekedCardIndex)}>
                           Pass This Card
                      </Button>
                  )}
              </div>
          </div>
      );
  }

  // 4. RESULTS
  if (gameState.status === 'RESULTS') {
      const isWinner = gameState.winnerId === peerId;
      const isLoser = gameState.loserId === peerId;
      const isFalseAlarm = gameState.loserId && !gameState.winnerId;
      const randomDare = DARES[Math.floor(Math.random() * DARES.length)];

      return (
          <div className="flex flex-col items-center pt-12 min-h-screen p-6 max-w-3xl mx-auto w-full">
               <div className="w-full">
                   <div className="text-center mb-8 animate-pop-in">
                       {isWinner && <div className="text-yellow-400 font-black text-6xl mb-4 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]">🏆 {t('fruit.youWon')}</div>}
                       {isLoser && (
                           <div className="text-red-500 font-black text-6xl mb-4 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                               {isFalseAlarm ? t('fruit.badSlam') : `🐌 ${t('fruit.youLost')}`}
                           </div>
                       )}
                       {!isWinner && !isLoser && <div className="text-white font-black text-4xl mb-4">Round Over!</div>}
                       
                       {isFalseAlarm && (
                           <div className="bg-red-500/20 p-4 rounded-xl border border-red-500/50 mb-4 inline-block">
                               <p className="text-red-200 text-xl font-bold flex items-center justify-center gap-2"><Siren className="animate-pulse"/> {t('fruit.badSlamDesc')}</p>
                           </div>
                       )}
                   </div>

                   {/* DARE CARD */}
                   {gameState.loserId && (
                       <div className="mb-8">
                           <Card className="bg-red-900/40 border-red-500/30 text-center">
                               <h3 className="text-red-300 font-bold uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                                   <Skull size={20}/> {t('fruit.dare')}
                               </h3>
                               <p className="text-2xl font-black text-white">
                                   "{randomDare}"
                               </p>
                               <div className="mt-2 text-sm text-white/40">
                                   For: {gameState.players.find(p => p.id === gameState.loserId)?.name}
                               </div>
                           </Card>
                       </div>
                   )}

                   <Card className="p-0 overflow-hidden mb-8 slide-up">
                       <div className="bg-white/5 p-4 font-bold text-center border-b border-white/10 uppercase tracking-widest text-white/50">{t('fruit.place')}</div>
                       {/* If it's a false alarm, the slam order might only contain the loser. We should show everyone else as 'Safe' */}
                       {isFalseAlarm ? (
                           // FALSE ALARM LEADERBOARD
                           <>
                                <div className="p-6 flex items-center justify-between border-b border-white/5 bg-red-500/10">
                                   <div className="flex items-center gap-4">
                                       <span className="font-mono text-xl font-bold w-8 text-red-400">X</span>
                                       <div className="font-bold text-xl">{gameState.players.find(p=>p.id===gameState.loserId)?.name}</div>
                                   </div>
                                   <span className="text-red-400 font-black text-sm uppercase bg-red-900/20 px-2 py-1 rounded">FALSE ALARM</span>
                                </div>
                                {gameState.players.filter(p => p.id !== gameState.loserId).map(p => (
                                    <div key={p.id} className="p-6 flex items-center justify-between border-b border-white/5 opacity-50">
                                       <div className="flex items-center gap-4">
                                           <span className="font-mono text-xl font-bold w-8">-</span>
                                           <div className="font-bold text-xl">{p.name}</div>
                                       </div>
                                       <span className="text-green-400 font-black text-xs uppercase border border-green-500/30 px-2 py-1 rounded">Safe</span>
                                    </div>
                                ))}
                           </>
                       ) : (
                           // NORMAL RACE LEADERBOARD
                           <>
                               {gameState.slamOrder.map((pid, idx) => {
                                   const p = gameState.players.find(pl => pl.id === pid);
                                   const isFirst = idx === 0;
                                   const isLast = idx === gameState.slamOrder.length - 1;
                                   
                                   return (
                                       <div key={pid} className={`p-6 flex items-center justify-between border-b border-white/5 ${isFirst ? 'bg-yellow-500/10' : ''} ${isLast ? 'bg-red-500/10' : ''}`}>
                                           <div className="flex items-center gap-4">
                                               <span className={`font-mono text-xl font-bold w-8 ${isFirst ? 'text-yellow-400' : 'text-white/30'}`}>#{idx+1}</span>
                                               <div className="font-bold text-xl">{p?.name}</div>
                                           </div>
                                           {isFirst && <Trophy className="text-yellow-400 animate-bounce"/>}
                                           {isLast && <span className="text-red-400 font-black text-sm uppercase bg-red-900/20 px-2 py-1 rounded">Loser</span>}
                                       </div>
                                   );
                               })}
                               {/* Show people who didn't slam (if any glitch/disconnect happened) */}
                               {gameState.players.filter(p => !gameState.slamOrder.includes(p.id)).map(p => (
                                   <div key={p.id} className="p-6 flex items-center justify-between border-b border-white/5 opacity-30">
                                       <div className="flex items-center gap-4">
                                           <span className="font-mono text-xl font-bold w-8">?</span>
                                           <div className="font-bold text-xl">{p.name}</div>
                                       </div>
                                       <span className="text-white/20 text-xs uppercase">Did not slam</span>
                                   </div>
                                ))}
                           </>
                       )}
                   </Card>

                   {isHost && (
                       <div className="flex justify-center gap-4">
                           <Button variant="glass" onClick={onExit}>Exit to Lobby</Button>
                           <Button variant="primary" size="lg" onClick={startGame}>
                               <RotateCcw className="mr-2"/> Play Again
                           </Button>
                       </div>
                   )}
                   
                   {!isHost && (
                        <div className="flex justify-center">
                            <Button variant="glass" onClick={onExit}>Exit to Lobby</Button>
                        </div>
                   )}
               </div>
          </div>
      );
  }

  return <div>Loading...</div>;
};

export default FruitGame;
