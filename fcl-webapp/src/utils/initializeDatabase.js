import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

// Sample data for initial setup
export const initializeDatabase = async () => {
  try {
    // Initialize a sample match
    await setDoc(doc(db, 'matches', 'current-match'), {
      title: 'IPL 2024 - Mumbai vs Chennai',
      date: '2024-10-22',
      venue: 'Wankhede Stadium, Mumbai',
      team1: {
        name: 'Mumbai Indians',
        runs: 185,
        wickets: 6,
        overs: 20.0
      },
      team2: {
        name: 'Chennai Super Kings',
        runs: 142,
        wickets: 8,
        overs: 18.3
      },
      status: 'live',
      currentOver: 18,
      currentBall: 3,
      currentBatsman1: {
        name: 'MS Dhoni',
        runs: 45
      },
      currentBatsman2: {
        name: 'Ravindra Jadeja',
        runs: 23
      },
      currentBowler: {
        name: 'Jasprit Bumrah'
      },
      recentBalls: ['1', '4', '2', 'W', '6', '1'],
      result: null,
      lastUpdated: new Date()
    });

    // Sample players
    const players = [
      {
        name: 'Virat Kohli',
        team: 'Royal Challengers Bangalore',
        type: 'batsman',
        age: 35,
        batting: {
          runs: 7263,
          average: 37.25,
          fifties: 50,
          hundreds: 7
        },
        bowling: {
          wickets: 4,
          average: 166.25,
          economy: 8.95,
          bestFigures: '1/15'
        },
        currentBid: 15000000,
        currentBidder: 'John Doe',
        currentBidderId: null
      },
      {
        name: 'Rohit Sharma',
        team: 'Mumbai Indians',
        type: 'batsman',
        age: 37,
        batting: {
          runs: 6211,
          average: 31.17,
          fifties: 40,
          hundreds: 8
        },
        bowling: {
          wickets: 15,
          average: 56.73,
          economy: 7.42,
          bestFigures: '2/27'
        },
        currentBid: 12000000,
        currentBidder: null,
        currentBidderId: null
      },
      {
        name: 'Jasprit Bumrah',
        team: 'Mumbai Indians',
        type: 'bowler',
        age: 30,
        batting: {
          runs: 67,
          average: 8.38,
          fifties: 0,
          hundreds: 0
        },
        bowling: {
          wickets: 165,
          average: 23.55,
          economy: 7.30,
          bestFigures: '5/27'
        },
        currentBid: 18000000,
        currentBidder: 'Jane Smith',
        currentBidderId: null
      },
      {
        name: 'Hardik Pandya',
        team: 'Mumbai Indians',
        type: 'allrounder',
        age: 30,
        batting: {
          runs: 2556,
          average: 27.33,
          fifties: 16,
          hundreds: 0
        },
        bowling: {
          wickets: 91,
          average: 28.67,
          economy: 9.05,
          bestFigures: '4/24'
        },
        currentBid: 14000000,
        currentBidder: null,
        currentBidderId: null
      },
      {
        name: 'MS Dhoni',
        team: 'Chennai Super Kings',
        type: 'wicketkeeper',
        age: 43,
        batting: {
          runs: 5082,
          average: 39.55,
          fifties: 24,
          hundreds: 0
        },
        bowling: {
          wickets: 0,
          average: 0,
          economy: 0,
          bestFigures: '-'
        },
        currentBid: 16000000,
        currentBidder: 'Mike Johnson',
        currentBidderId: null
      },
      {
        name: 'Rashid Khan',
        team: 'Gujarat Titans',
        type: 'bowler',
        age: 26,
        batting: {
          runs: 398,
          average: 11.37,
          fifties: 0,
          hundreds: 0
        },
        bowling: {
          wickets: 93,
          average: 21.56,
          economy: 6.33,
          bestFigures: '3/7'
        },
        currentBid: 11000000,
        currentBidder: null,
        currentBidderId: null
      }
    ];

    // Add players to Firestore
    for (const player of players) {
      await addDoc(collection(db, 'players'), {
        ...player,
        createdAt: new Date()
      });
    }

    console.log('Database initialized with sample data!');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
};

export default initializeDatabase;