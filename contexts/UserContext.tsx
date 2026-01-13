
import React, { createContext, useContext, useState, useEffect, useRef, PropsWithChildren } from 'react';
import { UserProfile, Friend, GameInvite } from '../types';
import * as db from '../utils/db';
import { generateShortCode } from '../hooks/usePeer'; // Re-use logic or just inline simple ID gen

declare const window: any;

interface UserContextType {
  user: UserProfile | null;
  friends: Friend[];
  pendingInvites: GameInvite[];
  createUser: (name: string) => Promise<void>;
  addScore: (points: number) => Promise<void>;
  addNewFriend: (id: string, name: string) => Promise<void>;
  removeFriend: (id: string) => Promise<void>;
  sendInvite: (friendId: string, gameType: string, gameCode: string) => void;
  clearInvite: (invite: GameInvite) => void;
  systemPeerId: string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: PropsWithChildren<{}>) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingInvites, setPendingInvites] = useState<GameInvite[]>([]);
  const [systemPeerId, setSystemPeerId] = useState<string | null>(null);
  
  const systemPeerRef = useRef<any>(null);

  // 1. Load Data on Mount
  useEffect(() => {
    const loadData = async () => {
      const u = await db.getUser();
      if (u) {
        setUser(u);
        const f = await db.getFriends();
        setFriends(f);
        connectSystemPeer(u.id);
      }
    };
    loadData();
    
    return () => {
        if (systemPeerRef.current) systemPeerRef.current.destroy();
    };
  }, []);

  // 2. System Peer Connection (For Invites)
  const connectSystemPeer = (userId: string) => {
    if (systemPeerRef.current) return;

    // IMPORTANT: The Peer ID is deterministic based on User ID
    const peerId = `gms-user-${userId}`;
    const peer = new window.Peer(peerId, { debug: 0 }); // Debug off
    systemPeerRef.current = peer;

    peer.on('open', (id: string) => {
      setSystemPeerId(id);
    });

    peer.on('connection', (conn: any) => {
      conn.on('data', (data: any) => {
         if (data.type === 'INVITE') {
             // { type: 'INVITE', fromName: string, gameType: string, gameCode: string }
             const invite: GameInvite = {
                 fromId: conn.peer,
                 fromName: data.fromName,
                 gameType: data.gameType,
                 gameCode: data.gameCode,
                 timestamp: Date.now()
             };
             setPendingInvites(prev => [...prev, invite]);
         }
      });
    });

    peer.on('error', (err: any) => { /* Silenced logs */ });
  };

  const createUser = async (name: string) => {
    const newUser: UserProfile = {
      id: Math.random().toString(36).substring(2, 8).toUpperCase(), // 6-char ID
      name,
      totalScore: 0,
      avatarColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
      createdAt: Date.now()
    };
    await db.saveUser(newUser);
    setUser(newUser);
    connectSystemPeer(newUser.id);
  };

  const addScore = async (points: number) => {
    if (!user) return;
    await db.updateUserScore(points);
    setUser(prev => prev ? ({ ...prev, totalScore: prev.totalScore + points }) : null);
  };

  const addNewFriend = async (id: string, name: string) => {
    const friend: Friend = { id, name, addedAt: Date.now() };
    await db.addFriend(friend);
    setFriends(prev => [...prev, friend]);
  };

  const removeFriend = async (id: string) => {
      await db.deleteFriend(id);
      setFriends(prev => prev.filter(f => f.id !== id));
  };

  const sendInvite = (friendId: string, gameType: string, gameCode: string) => {
      if (!systemPeerRef.current || !user) return;
      
      const targetPeerId = `gms-user-${friendId}`;
      const conn = systemPeerRef.current.connect(targetPeerId);
      
      conn.on('open', () => {
          conn.send({
              type: 'INVITE',
              fromName: user.name,
              gameType,
              gameCode
          });
          setTimeout(() => conn.close(), 1000); // Close after sending
      });
  };
  
  const clearInvite = (invite: GameInvite) => {
      setPendingInvites(prev => prev.filter(i => i !== invite));
  };

  return (
    <UserContext.Provider value={{ user, friends, pendingInvites, createUser, addScore, addNewFriend, removeFriend, sendInvite, clearInvite, systemPeerId }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
};
