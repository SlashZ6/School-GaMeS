
import { useState, useEffect, useRef, useCallback } from 'react';
import { PeerData } from '../types';

declare const window: any;

export type ConnectionStatus = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

// Prefix to avoid collisions on public PeerJS server
const APP_PREFIX = 'gms-app-v1-';

export const generateShortCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const usePeer = () => {
  const [peerId, setPeerId] = useState<string>(''); // Full ID
  const [displayCode, setDisplayCode] = useState<string>(''); // Short Code
  
  // We use a Ref for connections to ensure 'broadcast' always has the latest list
  const connectionsRef = useRef<Map<string, any>>(new Map());
  
  const [hostConn, setHostConn] = useState<any>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('IDLE');
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  const peerRef = useRef<any>(null);
  const onMessageRef = useRef<(data: PeerData, conn: any) => void>(() => {});

  // SELF-FIXER: Store last intent to retry
  const lastIntentRef = useRef<{
      type: 'CREATE' | 'JOIN' | null,
      args: any
  }>({ type: null, args: null });

  const retryTimeoutRef = useRef<any>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      connectionsRef.current.clear();
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  const resetPeer = useCallback(() => {
      if (peerRef.current) {
          peerRef.current.destroy();
          peerRef.current = null;
      }
      connectionsRef.current.clear();
      setHostConn(null);
      setIsHost(false);
      setConnectionStatus('IDLE');
      setErrorMsg('');
      setPeerId('');
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
  }, []);

  const attemptAutoFix = useCallback(() => {
      if (retryTimeoutRef.current) return; // Already scheduled
      
      const intent = lastIntentRef.current;
      if (!intent.type) return;

      // Schedule retry in 10s
      retryTimeoutRef.current = setTimeout(() => {
          retryTimeoutRef.current = null;
          if (intent.type === 'CREATE') {
              createGame(intent.args.playerName);
          } else if (intent.type === 'JOIN') {
              joinGame(intent.args.playerName, intent.args.code);
          }
      }, 10000);
  }, []);

  const setupCommonListeners = (peer: any) => {
    peer.on('error', (err: any) => {
        // Logs removed
        if (err.type === 'unavailable-id') {
             setErrorMsg("Game Code taken. Try creating again.");
        } else if (err.type === 'peer-unavailable') {
             setErrorMsg("Game Code not found. Check the code.");
        } else {
             setErrorMsg(err.type || 'Connection Error');
             // Trigger auto-fix for generic errors
             attemptAutoFix();
        }
        
        if (connectionStatus === 'CONNECTING') {
            setConnectionStatus('ERROR');
        }
    });

    peer.on('disconnected', () => {
        // Trigger auto-fix
        attemptAutoFix();
    });
  };

  const createGame = (playerName: string) => {
    lastIntentRef.current = { type: 'CREATE', args: { playerName } };
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);

    if (peerRef.current) peerRef.current.destroy();
    connectionsRef.current.clear();

    const code = generateShortCode();
    const fullId = `${APP_PREFIX}${code}`;
    
    setConnectionStatus('CONNECTING');

    const peer = new window.Peer(fullId, { debug: 0 });
    peerRef.current = peer;

    peer.on('open', (id: string) => {
      setPeerId(id);
      setDisplayCode(code);
      setIsHost(true);
      setConnectionStatus('CONNECTED');
    });

    setupCommonListeners(peer);

    peer.on('connection', (conn: any) => {
      connectionsRef.current.set(conn.peer, conn);

      conn.on('data', (data: PeerData) => {
        if (onMessageRef.current) onMessageRef.current(data, conn);
      });

      conn.on('open', () => {
         connectionsRef.current.set(conn.peer, conn);
      });

      conn.on('close', () => {
        connectionsRef.current.delete(conn.peer);
      });
      
      conn.on('error', (err: any) => {
          connectionsRef.current.delete(conn.peer);
      });
    });
  };

  const joinGame = (playerName: string, code: string) => {
    lastIntentRef.current = { type: 'JOIN', args: { playerName, code } };
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);

    if (peerRef.current) peerRef.current.destroy();
    
    const peer = new window.Peer(null, { debug: 0 });
    peerRef.current = peer;
    
    setConnectionStatus('CONNECTING');
    setErrorMsg('');

    peer.on('open', (id: string) => {
       setPeerId(id);
       
       const hostFullId = `${APP_PREFIX}${code.toUpperCase()}`;
       
       const conn = peer.connect(hostFullId, {
           metadata: { name: playerName },
           reliable: true
       });

       conn.on('open', () => {
           setHostConn(conn);
           setConnectionStatus('CONNECTED');
           setIsHost(false);
           
           conn.send({ 
                type: 'JOIN', 
                payload: { name: playerName, id: id } 
           });
       });

       conn.on('data', (data: PeerData) => {
           if (onMessageRef.current) onMessageRef.current(data, conn);
       });

       conn.on('close', () => {
           setHostConn(null);
           setConnectionStatus('ERROR');
           setErrorMsg("Host disconnected");
           attemptAutoFix();
       });

       conn.on('error', (err: any) => {
           setConnectionStatus('ERROR');
           attemptAutoFix();
       });
    });

    setupCommonListeners(peer);
  };

  const broadcast = useCallback((data: PeerData) => {
    connectionsRef.current.forEach((conn, peerId) => {
      if(conn.open) {
          conn.send(data);
      } else {
          connectionsRef.current.delete(peerId);
      }
    });
  }, []);

  const sendToHost = useCallback((data: PeerData) => {
    if (hostConn && hostConn.open) {
      hostConn.send(data);
    }
  }, [hostConn]);

  const sendTo = useCallback((conn: any, data: PeerData) => {
      if (conn && conn.open) {
          conn.send(data);
      }
  }, []);

  const setMessageHandler = useCallback((handler: (data: PeerData, conn: any) => void) => {
    onMessageRef.current = handler;
  }, []);

  return {
    peerId,
    displayCode,
    isHost,
    setIsHost,
    createGame,
    joinGame,
    broadcast,
    sendToHost,
    sendTo,
    setMessageHandler,
    resetPeer, // Exposed for manual reset
    connectionStatus,
    errorMsg
  };
};
