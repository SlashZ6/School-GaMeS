
// Game Generic Types
export enum Language {
  EN = 'en',
  AR = 'ar'
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
  // TicTacToe Ultimate Specific
  powerups?: {
    eraser: number;
    hallPass: number;
    switch: number;
    bomb: number;
    freeze: number;
  };
}

// User Profile & Social Types
export interface UserProfile {
  id: string; // Fixed unique ID (e.g., generated UUID)
  name: string;
  totalScore: number; // Global aggregated score
  avatarColor: string;
  createdAt: number;
}

export interface Friend {
  id: string;
  name: string;
  addedAt: number;
  highScore?: number; // Added for leaderboard view
}

export interface GameInvite {
  fromId: string;
  fromName: string;
  gameType: 'nap' | 'dots' | 'hangman' | 'fruit' | 'codenames' | 'tictactoe';
  gameCode: string; // The 4-letter PeerJS short code
  timestamp: number;
}

// PeerJS related types
export interface PeerData {
  type: string;
  payload: any;
}

export type GameStatus = 'LOBBY' | 'PLAYING' | 'SCORING' | 'LEADERBOARD' | 'SETUP' | 'GAME_OVER';

// NAP = Name Animal Plant
export interface NAPRoundAnswers {
  [key: string]: string; // Dynamic keys based on selected categories
}

export interface NAPPlayerRoundData {
  playerId: string;
  answers: NAPRoundAnswers;
  scores: {
    [key: string]: number;
  };
  totalRoundScore: number;
  isFinished: boolean;
}

export interface NAPGameState {
  status: GameStatus;
  currentRound: number;
  currentLetter: string;
  stopperId: string | null; // Player ID who stopped the round
  players: Player[];
  roundData: Record<string, NAPPlayerRoundData>; // key is playerId
  config: {
    targetScore: number; 
    mode: 'TIMER' | 'FIRST_TO_STOP';
    timerSeconds: number;
    letterSelection: 'AUTO' | 'MANUAL';
    activeCategories: string[]; // List of category keys (e.g. ['name', 'animal', 'food'])
  };
  startTime?: number; // timestamp for timer sync
}

// DOTS = Dots and Boxes
export type DotsShape = 'SQUARE' | 'DIAMOND' | 'CROSS' | 'DONUT' | 'HOURGLASS' | 'RANDOM';
export type DotsGridType = 'SQUARE' | 'TRIANGLE';

export interface DotsGameState {
  status: GameStatus;
  players: Player[];
  currentPlayerIndex: number;
  config: {
    gridSize: number; // Number of dots (e.g. 6 for 6x6 dots)
    shape: DotsShape;
    gridType: DotsGridType;
    turnTimeLimit: number; // Seconds. 0 = Off
  };
  // Tracking drawn lines. True = drawn.
  linesH: boolean[][]; 
  linesV: boolean[][];
  linesD: boolean[][]; // Diagonals (TopLeft -> BottomRight) for Triangle mode
  
  // Square Mode Ownership
  boxes: (string | null)[][];
  
  // Triangle Mode Ownership (split square into TopRight and BottomLeft triangles)
  triangles: { top: string | null; bottom: string | null }[][];

  // Active Boxes: [row][col] -> boolean. If false, this box is a "void" (part of the shape cut-out).
  activeBoxes: boolean[][];
  winnerId: string | null;
  lastInteraction: number; // Timestamp for turn timer
}

// HANGMAN
export interface HangmanGameState {
  status: GameStatus;
  players: Player[];
  currentPlayerIndex: number;
  category?: string; // Optional category hint
  config: {
    maxWrongGuesses: number;
    wordLanguage: Language;
    turnDuration: number; // 0 = Infinity
  };
  secretWord: string;
  guessedLetters: string[];
  wrongGuesses: number;
  winnerId: string | null; // 'HANGMAN' if lost, PlayerID if won
  lastInteraction: number;
}

// FRUIT GAME
export interface FruitCard {
  id: string;
  type: string; // The fruit emoji, text, or pattern
  isWild?: boolean; // GOLDEN FRUIT
}

export type FruitDeckType = 'CLASSIC' | 'CONFUSION' | 'CUSTOM';

export interface FruitGameState {
  status: 'LOBBY' | 'PLAYING' | 'SLAMMING' | 'RESULTS';
  players: Player[];
  hands: Record<string, FruitCard[]>; 
  selectedCards: Record<string, number>; 
  slamOrder: string[]; 
  winnerId: string | null;
  loserId: string | null;
  
  // New features tracking
  bluffActive?: boolean; 
  fouls: Record<string, number>; 

  config: {
    winCondition: 'CLASSIC' | 'PAIRS'; 
    deckType: FruitDeckType; // EMOJI vs TEXT vs CUSTOM
    customItems: string[]; // List of custom words/phrases provided by host
    mysteryMode: boolean; 
    wildcards: boolean; 
    bluffingAllowed: boolean; // New toggle to enable/disable the bluff button
  };
  lastInteraction: number;
}

// CODE NAMES
export type Team = 'RED' | 'BLUE';
export type CardType = 'RED' | 'BLUE' | 'NEUTRAL' | 'ASSASSIN';

export interface CodeNamesCard {
  id: string;
  word: string;
  type: CardType;
  isRevealed: boolean;
}

export interface CodeNamesGameState {
  status: 'LOBBY' | 'PLAYING' | 'GAME_OVER';
  players: Player[];
  
  // Team Assignments (Player IDs)
  teams: {
    RED: string[];
    BLUE: string[];
  };
  
  // Spymasters (Player IDs)
  spymasters: {
    RED: string | null;
    BLUE: string | null;
  };

  config: {
      turnDuration: number; // 0 = Infinite
  };

  cards: CodeNamesCard[];
  
  // Suggestions: CardID -> List of PlayerIDs who are pointing at it
  suggestedCards: Record<string, string[]>;

  currentTurn: Team;
  turnPhase: 'CLUE' | 'GUESS'; // Spymaster giving clue vs Operatives guessing
  
  currentClue: {
    word: string;
    number: number | '∞' | 0;
  } | null;
  
  guessesLeft: number | '∞'; // How many guesses the team has left this turn
  
  score: {
    RED: number; // Cards left to find (Starts at 9 or 8, goes to 0)
    BLUE: number;
  };
  
  winner: Team | null;
  gameLog: string[]; // History of moves
  lastInteraction: number; // For timer
}

// TIC TAC TOE ULTIMATE
export interface TicTacToeGameState {
  status: 'LOBBY' | 'PLAYING' | 'GAME_OVER';
  players: Player[];
  currentPlayerIndex: number; // 0 is X, 1 is O
  
  // 9 sub-boards, each is an array of 9 cells (null, 'X', 'O')
  // Outer index 0-8 represents the sub-board. Inner 0-8 is cell.
  boards: (string | null)[][]; 
  
  // Status of the 9 sub-boards (null = active, 'X', 'O', 'D' for Draw)
  boardStatus: (string | null)[]; 
  
  // Store the winning line indices for visual effects (e.g. [0, 4, 8])
  winningLines: (number[] | null)[];

  // Board Effects (e.g. Frozen) - Key is Board Index
  boardEffects: Record<number, { type: 'FROZEN'; untilTurn: number }>;

  // The index of the board the next player MUST play in. null if free choice.
  activeBoardIndex: number | null;
  
  winnerId: string | null;
  lastInteraction: number;
  
  // For Extreme Mode
  gameLog: string[];
  activePowerUp: 'ERASER' | 'HALL_PASS' | 'BOMB' | 'FREEZE' | null;
  
  config: {
    turnDuration: number; // 0 = Infinite
    gameMode: 'CLASSIC' | 'EXTREME';
    gravity: boolean; // Symbols fall to bottom
    fogOfWar: boolean; // Only active board is visible
    winCondition: 'LINE' | 'POINTS'; // 3-in-row vs Most boards captured
  };
}