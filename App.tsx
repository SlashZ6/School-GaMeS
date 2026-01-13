
import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import { UserProvider, useUser } from './contexts/UserContext';
import Home from './pages/Home';
import NameAnimalPlantGame from './games/NameAnimalPlant';
import DotsAndBoxesGame from './games/DotsAndBoxes';
import HangmanGame from './games/Hangman';
import FruitGame from './games/Fruit';
import CodeNamesGame from './games/CodeNames';
import TicTacToeUltimateGame from './games/TicTacToeUltimate';
import { Input, Button, Card } from './components/ui/GenericUI';
import { Sparkles, Check, X, Gamepad2 } from 'lucide-react';

// Onboarding Component
const Onboarding = () => {
    const { createUser } = useUser();
    const [name, setName] = useState('');
    
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#1e1b4b]">
            <Card className="w-full max-w-md text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 mx-auto mb-6 flex items-center justify-center shadow-lg animate-bounce">
                    <Sparkles size={40} className="text-white"/>
                </div>
                <h1 className="text-4xl font-black mb-2">Welcome to GaMeS</h1>
                <p className="text-white/60 mb-8">Create your profile to start playing and adding friends.</p>
                <div className="mb-6">
                    <label className="text-xs font-bold uppercase text-white/50 block mb-2 text-left">Your Nickname</label>
                    <Input placeholder="SuperPlayer" value={name} onChange={e => setName(e.target.value)} maxLength={15} autoFocus/>
                </div>
                <Button variant="primary" size="lg" className="w-full" disabled={!name.trim()} onClick={() => createUser(name.trim())}>
                    Get Started
                </Button>
            </Card>
        </div>
    );
};

const AppContent = () => {
  const { user, pendingInvites, clearInvite } = useUser();
  const [currentPage, setCurrentPage] = useState<'home' | 'nap' | 'dots' | 'hangman' | 'fruit' | 'codenames' | 'tictactoe'>('home');
  const [autoJoinData, setAutoJoinData] = useState<{code: string} | null>(null);

  useEffect(() => {
     if(currentPage === 'home') setAutoJoinData(null);
  }, [currentPage]);

  if (!user) {
      return <Onboarding />;
  }

  const handleInviteAccept = (invite: any) => {
      setCurrentPage(invite.gameType as any);
      setAutoJoinData({ code: invite.gameCode });
      clearInvite(invite);
  };

  return (
    <div className="min-h-screen text-white selection:bg-pink-500 selection:text-white relative">
      {/* Invite Notifications */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4">
          {pendingInvites.map((invite, idx) => (
              <div key={idx} className="bg-indigo-900/90 border border-indigo-500 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-between animate-slide-up">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center animate-pulse">
                          <Gamepad2 size={20}/>
                      </div>
                      <div>
                          <div className="font-bold text-sm">Game Invite</div>
                          <div className="text-xs opacity-80"><span className="font-black text-yellow-300">{invite.fromName}</span> invites you to <span className="uppercase font-bold">{invite.gameType}</span></div>
                      </div>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => clearInvite(invite)} className="p-2 bg-white/10 rounded-lg hover:bg-white/20"><X size={16}/></button>
                      <button onClick={() => handleInviteAccept(invite)} className="p-2 bg-emerald-500 rounded-lg hover:bg-emerald-400"><Check size={16}/></button>
                  </div>
              </div>
          ))}
      </div>

      {currentPage === 'home' && (
        <Home onSelectGame={(gameId) => setCurrentPage(gameId as any)} />
      )}
      
      {currentPage === 'nap' && (
        <NameAnimalPlantGame onExit={() => setCurrentPage('home')} autoJoinCode={autoJoinData?.code} />
      )}

      {currentPage === 'dots' && (
        <DotsAndBoxesGame onExit={() => setCurrentPage('home')} autoJoinCode={autoJoinData?.code} />
      )}

      {currentPage === 'hangman' && (
        <HangmanGame onExit={() => setCurrentPage('home')} autoJoinCode={autoJoinData?.code} />
      )}

      {currentPage === 'fruit' && (
        <FruitGame onExit={() => setCurrentPage('home')} autoJoinCode={autoJoinData?.code} />
      )}

      {currentPage === 'codenames' && (
        <CodeNamesGame onExit={() => setCurrentPage('home')} autoJoinCode={autoJoinData?.code} />
      )}

      {currentPage === 'tictactoe' && (
        <TicTacToeUltimateGame onExit={() => setCurrentPage('home')} autoJoinCode={autoJoinData?.code} />
      )}
    </div>
  );
};

function App() {
  return (
    <LanguageProvider>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </LanguageProvider>
  );
}

export default App;