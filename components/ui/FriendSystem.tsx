
import React, { useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import { Card, Button, Input } from './GenericUI';
import { Users, Plus, UserPlus, Trophy, Send, X, Check, Trash2, Eye } from 'lucide-react';

export const FriendSystemModal = ({ 
    isOpen, 
    onClose, 
    inviteMode = false,
    currentGameInfo = null 
}: { 
    isOpen: boolean; 
    onClose: () => void;
    inviteMode?: boolean;
    currentGameInfo?: { type: string, code: string } | null;
}) => {
    const { user, friends, addNewFriend, removeFriend, sendInvite } = useUser();
    const [addId, setAddId] = useState('');
    const [addName, setAddName] = useState('');
    const [view, setView] = useState<'LIST' | 'ADD'>('LIST');

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <Card className="w-full max-w-md bg-[#1e1b4b] border border-white/20 p-6 flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-white flex items-center gap-2">
                        {inviteMode ? 'Invite Friends' : 'My Friends'}
                    </h2>
                    <button onClick={onClose} className="text-white/50 hover:text-white"><X size={24}/></button>
                </div>

                {view === 'LIST' ? (
                    <>
                         <div className="flex-1 overflow-y-auto bubble-scrollbar space-y-3 mb-4">
                            {friends.length === 0 ? (
                                <div className="text-center text-white/40 py-8 italic">
                                    No friends yet. Add some!
                                </div>
                            ) : (
                                friends.map(f => (
                                    <div key={f.id} className="bg-white/10 p-3 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold">
                                                {f.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold">{f.name}</div>
                                                <div className="text-xs text-white/40 font-mono">ID: {f.id}</div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            {inviteMode && currentGameInfo ? (
                                                <Button size="sm" variant="success" onClick={() => {
                                                    sendInvite(f.id, currentGameInfo.type, currentGameInfo.code);
                                                    alert("Invite sent!");
                                                }}>
                                                    <Send size={16}/>
                                                </Button>
                                            ) : (
                                                <button 
                                                    onClick={() => {
                                                        if(confirm(`Remove ${f.name} from friends?`)) {
                                                            removeFriend(f.id);
                                                        }
                                                    }}
                                                    className="p-2 text-white/30 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                         </div>
                         {!inviteMode && (
                             <Button variant="secondary" onClick={() => setView('ADD')} className="w-full">
                                 <UserPlus className="mr-2"/> Add New Friend
                             </Button>
                         )}
                    </>
                ) : (
                    <div className="flex flex-col gap-4 animate-fade-in">
                        <p className="text-white/60 text-sm">Ask your friend for their ID (found on their profile).</p>
                        <div>
                            <label className="text-xs font-bold uppercase text-white/50">Friend ID</label>
                            <Input placeholder="e.g. X7Y2Z1" value={addId} onChange={e => setAddId(e.target.value.toUpperCase())} maxLength={6}/>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-white/50">Their Name (Nickname)</label>
                            <Input placeholder="e.g. Bestie" value={addName} onChange={e => setAddName(e.target.value)} maxLength={15}/>
                        </div>
                        <div className="flex gap-2 mt-2">
                             <Button variant="glass" onClick={() => setView('LIST')} className="flex-1">Cancel</Button>
                             <Button 
                                variant="primary" 
                                className="flex-1"
                                disabled={!addId || !addName}
                                onClick={() => {
                                    addNewFriend(addId, addName);
                                    setView('LIST');
                                    setAddId('');
                                    setAddName('');
                                }}
                             >
                                 Add Friend
                             </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};
