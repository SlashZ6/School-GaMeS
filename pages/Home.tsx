
import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { Button, Card, Badge } from '../components/ui/GenericUI';
import { Gamepad2, Globe, Grid3x3, Skull, Apple, User, Trophy, Users, Copy, RefreshCw, VenetianMask, X, Circle, Settings } from 'lucide-react';
import { Language } from '../types';
import { FriendSystemModal } from '../components/ui/FriendSystem';
import { usePeer } from '../hooks/usePeer';

interface HomeProps {
  onSelectGame: (gameId: string) => void;
}

const Home: React.FC<HomeProps> = ({ onSelectGame }) => {
  const { t, setLang, lang } = useLanguage();
  const { user, friends } = useUser();
  const { resetPeer } = usePeer();
  const [showFriends, setShowFriends] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center p-6 relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
         <div className="bg-blob w-[60vw] h-[60vw] bg-indigo-600/30 rounded-full top-[-20%] left-[-20%] blur-[100px]"></div>
         <div className="bg-blob w-[50vw] h-[50vw] bg-pink-600/20 rounded-full bottom-[-10%] right-[-10%] blur-[100px] animation-delay-2000"></div>
         <div className="bg-blob w-[40vw] h-[40vw] bg-cyan-600/20 rounded-full top-[40%] left-[30%] blur-[80px] animation-delay-4000"></div>
      </div>

      {/* Top Controls */}
      <div className="absolute top-6 left-6 z-20">
         <button 
           onClick={() => {
               if(confirm("Reset network connection? Use this if you have trouble connecting.")) {
                   resetPeer();
                   window.location.reload(); 
               }
           }}
           className="bg-white/10 hover:bg-white/20 p-2 rounded-xl text-xs font-bold text-white/50 hover:text-white flex items-center gap-2 transition-colors"
           title="Fix Connection"
         >
             <RefreshCw size={14}/>
         </button>
      </div>

      <div className="absolute top-6 right-6 z-20 flex gap-3">
        <button 
          onClick={() => setLang(lang === Language.EN ? Language.AR : Language.EN)}
          className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl backdrop-blur transition-all active:scale-95 border border-white/10 flex items-center gap-2"
        >
          <Globe className="text-white w-5 h-5" />
          <span className="font-bold text-sm">{lang === Language.EN ? 'العربية' : 'English'}</span>
        </button>
      </div>

      {/* Profile Section */}
      <div className="w-full max-w-7xl mt-16 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 px-4">
         <div className="flex flex-col items-center md:items-start text-center md:text-start">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-indigo-100 to-indigo-300 drop-shadow-2xl leading-none py-2">
              {t('welcome')}
            </h1>
            <p className="text-xl text-indigo-200 font-bold opacity-80 tracking-wide mt-2">{t('tagline')}</p>
         </div>

         {user && (
             <div className="glass-panel rounded-3xl p-4 md:p-6 flex items-center gap-4 shadow-xl animate-pop-in min-w-[300px]">
                 <div className="w-16 h-16 rounded-full border-4 border-white/20 flex items-center justify-center font-black text-3xl shadow-lg" style={{backgroundColor: user.avatarColor}}>
                     {user.name.charAt(0)}
                 </div>
                 <div className="flex flex-col flex-1">
                     <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                     <div className="flex items-center gap-2 text-white/50 text-sm font-mono cursor-pointer hover:text-white transition-colors" onClick={() => {navigator.clipboard.writeText(user.id); alert('ID Copied!');}}>
                         ID: {user.id} <Copy size={12}/>
                     </div>
                     <div className="flex items-center gap-2 mt-2">
                         <Badge color="bg-yellow-500/20 border-yellow-500 text-yellow-300 text-xs px-2 py-0.5 flex items-center gap-1">
                             <Trophy size={12}/> {user.totalScore} pts
                         </Badge>
                     </div>
                 </div>
                 <button onClick={() => setShowFriends(true)} className="bg-white/10 p-3 rounded-2xl hover:bg-white/20 transition-colors border border-white/5">
                     <Users className="text-pink-300" size={24}/>
                 </button>
             </div>
         )}
      </div>

      <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 pb-12">
        {/* Game Cards */}
        <div onClick={() => onSelectGame('nap')} className="group cursor-pointer relative transform transition-all hover:scale-[1.02] hover:-translate-y-2">
          <Card className="relative h-full flex flex-col items-center text-center py-10 px-6 bg-gradient-to-b from-white/5 to-white/0 hover:bg-white/10 transition-colors border-white/5">
            <div className="bg-gradient-to-tr from-pink-500 to-violet-500 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-pink-500/20 group-hover:scale-110 group-hover:rotate-6 transition duration-300">
              <Gamepad2 size={40} className="text-white" />
            </div>
            <h3 className="text-2xl font-black mb-2">{t('game.nap')}</h3>
            <p className="text-white/50 mb-6 text-sm font-medium leading-relaxed">{t('game.napDesc')}</p>
            <div className="mt-auto"><Badge color="bg-emerald-500/20 text-emerald-300 border-emerald-500/50 text-xs py-1 px-3">Classic</Badge></div>
          </Card>
        </div>

        <div onClick={() => onSelectGame('dots')} className="group cursor-pointer relative transform transition-all hover:scale-[1.02] hover:-translate-y-2">
          <Card className="relative h-full flex flex-col items-center text-center py-10 px-6 bg-gradient-to-b from-white/5 to-white/0 hover:bg-white/10 transition-colors border-white/5">
            <div className="bg-gradient-to-tr from-cyan-400 to-blue-500 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/20 group-hover:scale-110 group-hover:-rotate-6 transition duration-300">
              <Grid3x3 size={40} className="text-white" />
            </div>
            <h3 className="text-2xl font-black mb-2">{t('game.dots')}</h3>
            <p className="text-white/50 mb-6 text-sm font-medium leading-relaxed">{t('game.dotsDesc')}</p>
            <div className="mt-auto"><Badge color="bg-blue-500/20 text-blue-300 border-blue-500/50 text-xs py-1 px-3">Strategic</Badge></div>
          </Card>
        </div>

        <div onClick={() => onSelectGame('hangman')} className="group cursor-pointer relative transform transition-all hover:scale-[1.02] hover:-translate-y-2">
          <Card className="relative h-full flex flex-col items-center text-center py-10 px-6 bg-gradient-to-b from-white/5 to-white/0 hover:bg-white/10 transition-colors border-white/5">
            <div className="bg-gradient-to-tr from-teal-400 to-emerald-500 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-teal-500/20 group-hover:scale-110 group-hover:rotate-6 transition duration-300">
              <Skull size={40} className="text-white" />
            </div>
            <h3 className="text-2xl font-black mb-2">{t('game.hangman')}</h3>
            <p className="text-white/50 mb-6 text-sm font-medium leading-relaxed">{t('game.hangmanDesc')}</p>
            <div className="mt-auto"><Badge color="bg-orange-500/20 text-orange-300 border-orange-500/50 text-xs py-1 px-3">Brainy</Badge></div>
          </Card>
        </div>

        <div onClick={() => onSelectGame('tictactoe')} className="group cursor-pointer relative transform transition-all hover:scale-[1.02] hover:-translate-y-2">
          <Card className="relative h-full flex flex-col items-center text-center py-10 px-6 bg-gradient-to-b from-white/5 to-white/0 hover:bg-white/10 transition-colors border-white/5">
            <div className="bg-gradient-to-tr from-cyan-400 to-indigo-500 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/20 group-hover:scale-110 group-hover:-rotate-6 transition duration-300 relative">
               <div className="flex gap-1">
                   <X size={24} strokeWidth={3}/>
                   <Circle size={24} strokeWidth={3}/>
               </div>
            </div>
            <h3 className="text-2xl font-black mb-2">{t('game.tictactoe')}</h3>
            <p className="text-white/50 mb-6 text-sm font-medium leading-relaxed">{t('game.tictactoeDesc')}</p>
            <div className="mt-auto"><Badge color="bg-indigo-500/20 text-indigo-300 border-indigo-500/50 text-xs py-1 px-3">Tactical</Badge></div>
          </Card>
        </div>

         <div onClick={() => onSelectGame('fruit')} className="group cursor-pointer relative transform transition-all hover:scale-[1.02] hover:-translate-y-2">
          <Card className="relative h-full flex flex-col items-center text-center py-10 px-6 bg-gradient-to-b from-white/5 to-white/0 hover:bg-white/10 transition-colors border-white/5">
            <div className="bg-gradient-to-tr from-orange-400 to-red-500 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20 group-hover:scale-110 group-hover:rotate-6 transition duration-300">
              <Apple size={40} className="text-white" />
            </div>
            <h3 className="text-2xl font-black mb-2">{t('game.fruit')}</h3>
            <p className="text-white/50 mb-6 text-sm font-medium leading-relaxed">{t('game.fruitDesc')}</p>
            <div className="mt-auto"><Badge color="bg-red-500/20 text-red-300 border-red-500/50 text-xs py-1 px-3">Chaos</Badge></div>
          </Card>
        </div>

        <div onClick={() => onSelectGame('codenames')} className="group cursor-pointer relative transform transition-all hover:scale-[1.02] hover:-translate-y-2">
          <Card className="relative h-full flex flex-col items-center text-center py-10 px-6 bg-gradient-to-b from-white/5 to-white/0 hover:bg-white/10 transition-colors border-white/5">
            <div className="bg-gradient-to-tr from-slate-500 to-gray-700 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-slate-500/20 group-hover:scale-110 group-hover:-rotate-6 transition duration-300">
              <VenetianMask size={40} className="text-white" />
            </div>
            <h3 className="text-2xl font-black mb-2">{t('game.codenames')}</h3>
            <p className="text-white/50 mb-6 text-sm font-medium leading-relaxed">{t('game.codenamesDesc')}</p>
            <div className="mt-auto"><Badge color="bg-slate-500/20 text-slate-300 border-slate-500/50 text-xs py-1 px-3">Team</Badge></div>
          </Card>
        </div>
      </div>

      <footer className="mt-auto py-10 text-white/20 text-sm font-bold tracking-widest uppercase">
        Built with Love & React
      </footer>
      
      <FriendSystemModal isOpen={showFriends} onClose={() => setShowFriends(false)} />
    </div>
  );
};

export default Home;
