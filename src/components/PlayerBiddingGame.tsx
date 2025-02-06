"use client";
import React, { useState, useEffect } from "react";
import { ImHammer2 } from "react-icons/im";
import { IoWalletSharp } from "react-icons/io5";

// Custom hook for localStorage persistence
interface BidHistoryEntry {
  player: string;
  bid: number;
  captain: number;
  action: string;
  timestamp: string;
}

interface Player {
  id: number;
  name: string;
  value: number;
}

const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue; // ✅ Prevent SSR issues
    try {
      const storedValue = localStorage.getItem(key);
      return storedValue !== null ? (JSON.parse(storedValue) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error("Failed to save to localStorage", error);
      }
    }
  }, [key, value]); // ✅ Only runs when `key` or `value` changes (prevents infinite loop)

  return [value, setValue];
};
const totalPoint = 200;
const PlayerBiddingGame = () => {
  // State management using custom localStorage hook
  const [captain1, setCaptain1] = useLocalStorage("captain1", "");
  const [captain2, setCaptain2] = useLocalStorage("captain2", "");
  const [playerCount, setPlayerCount] = useLocalStorage("playerCount", 10);
  const [playerNames, setPlayerNames] = useLocalStorage<string[]>(
    "playerNames",
    []
  );
  const [players, setPlayers] = useLocalStorage<Player[]>("players", []);
  const [points1, setPoints1] = useLocalStorage("points1", totalPoint);
  const [points2, setPoints2] = useLocalStorage("points2", totalPoint);
  const [team1Players, setTeam1Players] = useLocalStorage<Player[]>(
    "team1Players",
    []
  );
  const [team2Players, setTeam2Players] = useLocalStorage<Player[]>(
    "team2Players",
    []
  );
  const [currentCaptain, setCurrentCaptain] = useLocalStorage(
    "currentCaptain",
    Math.random() > 0.5 ? 1 : 2
  );
  const [currentBid, setCurrentBid] = useLocalStorage("currentBid", 10);
  const [lastBidCaptain, setLastBidCaptain] = useLocalStorage<1 | 2 | null>(
    "lastBidCaptain",
    null
  );
  const [currentPlayerIndex, setCurrentPlayerIndex] = useLocalStorage(
    "currentPlayerIndex",
    0
  );
  const [selectedPlayers, setSelectedPlayers] = useLocalStorage<number[]>(
    "selectedPlayers",
    []
  );
  const [message, setMessage] = useLocalStorage("message", "");
  const [firstSkip, setFirstSkip] = useLocalStorage("firstSkip", false);
  const [bidHistory, setBidHistory] = useLocalStorage<BidHistoryEntry[]>(
    "bidHistory",
    []
  );
  const [isBidOrSkipp, setIsBidOrSkipp] = useState(false);
  const [isBid, setIsBid] = useState(false);
  const startGame = () => {
    if (!captain1 || !captain2 || playerNames.length !== playerCount) {
      alert("Please enter valid inputs for captains and players.");
      return;
    }
    const generatedPlayers = playerNames
      .map((name, index) => ({
        id: Math.floor(Math.random() * 1000) + index,
        name,
        value: 5,
      }))
      .sort((a, b) => a.id - b.id);

    setPlayers(generatedPlayers);
    setCurrentPlayerIndex(0);
    setLastBidCaptain(currentCaptain === 1 ? 2 : 1);
    setMessage(`${generatedPlayers[0].name} (Current Bid: ${currentBid} pts)`);
    setBidHistory([]);
    setPoints1(totalPoint);
    setPoints2(totalPoint);
    setTeam1Players([]);
    setTeam2Players([]);
    setSelectedPlayers([]);
    setFirstSkip(false);
  };

  const resetBidding = () => {
    setPlayers([]);
    setSelectedPlayers([]);
    setMessage("");
    setBidHistory([]);
    setPoints1(totalPoint);
    setPoints2(totalPoint);
    setTeam1Players([]);
    setTeam2Players([]);
    setCurrentBid(10);
    setCurrentCaptain(Math.random() > 0.5 ? 1 : 2);
    setLastBidCaptain(null);
    setCurrentPlayerIndex(0);
    setFirstSkip(false);
    setIsBidOrSkipp(false);
  };

  interface AddBidToHistoryParams {
    action: string;
    player: Player;
  }

  const addBidToHistory = ({ action, player }: AddBidToHistoryParams): void => {
    setBidHistory((prev) => [
      ...prev,
      {
        player: player.name,
        bid: currentBid,
        captain: currentCaptain,
        action,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const placeBid = () => {
    if (
      (currentCaptain === 1 && points1 < currentBid) ||
      (currentCaptain === 2 && points2 < currentBid)
    ) {
      // Captain cannot bid, give option to the opposite captain
      setMessage(
        `Captain ${currentCaptain} cannot bid. Captain ${
          currentCaptain === 1 ? 2 : 1
        }, do you want to keep ${
          players[currentPlayerIndex].name
        } at base point (5 pts) or skip?`
      );
      setIsBidOrSkipp(true); // Enable the "Finalize Bid" or "Skip Player" option for the opposite captain
      setIsBid(true);
      return;
    }

    // Proceed with the bid
    setIsBidOrSkipp(true);
    setIsBid(true);
    setFirstSkip(false);
    addBidToHistory({ action: "bid", player: players[currentPlayerIndex] });
    setLastBidCaptain(currentCaptain as 1 | 2);
    setCurrentBid((prev) =>
      prev < points1 ? prev + 5 : prev < points2 ? prev + 5 : prev
    );
    setCurrentCaptain((prev) => (prev === 1 || points1 <= 10 ? 2 : 1));
    setMessage(
      `${players[currentPlayerIndex].name} (Current Bid: ${
        currentBid < totalPoint ? currentBid + 5 : currentBid
      } pts)`
    );
  };
  const assignRemainingPlayersRandomly = () => {
    const remainingPlayers = [...players];
    const team1Count = team1Players.length;
    const team2Count = team2Players.length;

    while (remainingPlayers.length > 0) {
      const randomPlayerIndex = Math.floor(
        Math.random() * remainingPlayers.length
      );
      const player = remainingPlayers.splice(randomPlayerIndex, 1)[0];

      if (team1Count <= team2Count) {
        setTeam1Players((prev) => [...prev, { ...player, value: 10 }]);
      } else {
        setTeam2Players((prev) => [...prev, { ...player, value: 10 }]);
      }
    }

    setPlayers([]);
    setMessage("All remaining players assigned randomly to balance teams.");
  };
  useEffect(() => {
    if (points1 < currentBid && points2 < currentBid && players.length > 0) {
      assignRemainingPlayersRandomly();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points1, points2, currentBid, players]);

  const directskip = () => {
    const currentPlayer = players[currentPlayerIndex];

    // Move the skipped player to the end of the players array
    setPlayers((prev) => {
      const updated = [...prev];
      const [skipped] = updated.splice(currentPlayerIndex, 1);
      return [...updated, skipped];
    });

    // Update the message to indicate the player was skipped
    setMessage(
      `${currentPlayer.name} skipped! Next player: ${
        players[currentPlayerIndex + 1]?.name || "None"
      }`
    );

    // Add the skip action to the bid history
    addBidToHistory({ action: "skip", player: currentPlayer });

    // Move to the next player
    if (players.length > 1) {
      setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
    } else {
      setMessage("No more players to skip.");
    }

    // Reset the bid amount
    setCurrentBid(10);
  };

  const skipPlayer = () => {
    const currentPlayer = players[currentPlayerIndex];
    const fSkip = firstSkip;
    // fSkip = points1<10||points2<10 ? true : false;
    // If current captain skips, switch to other captain
    if (!fSkip) {
      setIsBidOrSkipp(true);
      setFirstSkip(true);
      setCurrentCaptain((prev) => (prev === 1 || points1 <= 10 ? 2 : 1));
      setMessage(
        `${currentPlayer.name} skipped by Captain ${currentCaptain}. Captain ${
          currentCaptain === 1 ? 2 : 1
        }'s turn.`
      );
      addBidToHistory({ action: "skip", player: currentPlayer });

      return;
    }

    setIsBidOrSkipp(false);

    // Move skipped player to end of queue
    setPlayers((prev) => {
      const updated = [...prev];
      const [skipped] = updated.splice(currentPlayerIndex, 1);
      return [...updated, skipped];
    });

    // Reset skip state
    setFirstSkip(false);

    // Move to next player
    setCurrentPlayerIndex(0);

    // Update message and history
    setMessage(
      `${currentPlayer.name} successfully skipped! Next player: ${
        players[currentPlayerIndex + 1].name
      }`
    );
    addBidToHistory({ action: "skip-final", player: currentPlayer });

    // Reset bid and turn
    setCurrentBid(10);
    // setCurrentCaptain(Math.random() > 0.5 ? 1 : 2);
  };

  const finalizeBid = () => {
    if (lastBidCaptain === null) return;
    setFirstSkip(false);
    setIsBidOrSkipp(false);
    setIsBid(false);

    const currentPlayer = players[currentPlayerIndex];
    const isTeam1Full = team1Players.length >= playerCount / 2;
    const isTeam2Full = team2Players.length >= playerCount / 2;

    // If one team is full, assign all remaining players to the opposite team
    if (isTeam1Full || isTeam2Full) {
      const remainingPlayers = [...players];
      // const targetTeam = isTeam1Full ? team2Players : team1Players;
      const setTargetTeam = isTeam1Full ? setTeam2Players : setTeam1Players;

      remainingPlayers.forEach((player) => {
        setTargetTeam((prev) => [...prev, { ...player, value: 10 }]);
      });

      setPlayers([]);
      setMessage(
        `Team ${
          isTeam1Full ? 1 : 2
        } is full. All remaining players assigned to Team ${
          isTeam1Full ? 2 : 1
        } at base point.`
      );
      return;
    }

    // Validate team balance
    if (
      (lastBidCaptain === 1 && isTeam1Full) ||
      (lastBidCaptain === 2 && isTeam2Full)
    ) {
      alert(`Team ${lastBidCaptain} is full!`);
      return;
    }

    const playerWithBid = { ...currentPlayer, value: currentBid };
    let pointsa = points1;
    let pointsb = points2;

    if (lastBidCaptain === 1) {
      setPoints1((prev) => prev - currentBid);
      pointsa = points1 - currentBid;
      setTeam1Players((prev) => [...prev, playerWithBid]);
    } else {
      setPoints2((prev) => prev - currentBid);
      pointsb = points2 - currentBid;
      setTeam2Players((prev) => [...prev, playerWithBid]);
    }

    addBidToHistory({ action: "finalize", player: currentPlayer });
    setSelectedPlayers((prev) => [...prev, currentPlayer.id]);
    setPlayers((prev) => prev.filter((p) => p.id !== currentPlayer.id));

    // Move to next player or end game
    if (players.length > 1) {
      setCurrentPlayerIndex(0);
      setMessage(`${players[1].name} (Current Bid: 10 pts)`);
    } else {
      setMessage("Bidding complete! All players assigned.");
    }

    setCurrentBid(10);
    setCurrentCaptain((prev) =>
      prev === 1 ? (pointsb > 5 ? 2 : 1) : pointsa > 5 ? 1 : 2
    );
    setLastBidCaptain(
      currentCaptain === 1 ? (pointsb > 5 ? 1 : 2) : pointsa > 5 ? 2 : 1
    );
  };
  const keepBid = () => {
    if (lastBidCaptain === null) return;
    setFirstSkip(false);
    setIsBidOrSkipp(false);

    const currentPlayer = players[currentPlayerIndex];
    const isTeam1Full = team1Players.length >= playerCount / 2;
    const isTeam2Full = team2Players.length >= playerCount / 2;

    // If one team is full, assign all remaining players to the opposite team
    if (isTeam1Full || isTeam2Full) {
      const remainingPlayers = [...players];
      // const targetTeam = isTeam1Full ? team2Players : team1Players;
      const setTargetTeam = isTeam1Full ? setTeam2Players : setTeam1Players;

      remainingPlayers.forEach((player) => {
        setTargetTeam((prev) => [...prev, { ...player, value: 10 }]);
      });

      setPlayers([]);
      setMessage(
        `Team ${
          isTeam1Full ? 1 : 2
        } is full. All remaining players assigned to Team ${
          isTeam1Full ? 2 : 1
        } at base point.`
      );
      return;
    }

    // Validate team balance
    if (
      (lastBidCaptain === 1 && isTeam1Full) ||
      (lastBidCaptain === 2 && isTeam2Full)
    ) {
      alert(`Team ${lastBidCaptain} is full!`);
      return;
    }

    const playerWithBid = { ...currentPlayer, value: currentBid };
    if (firstSkip) {
      if (currentCaptain === 1) {
        setPoints1((prev) => prev - currentBid);
        setTeam1Players((prev) => [...prev, playerWithBid]);
      } else {
        setPoints2((prev) => prev - currentBid);
        setTeam2Players((prev) => [...prev, playerWithBid]);
      }
    } else {
      if (lastBidCaptain === 1) {
        setPoints2((prev) => prev - currentBid);
        setTeam2Players((prev) => [...prev, playerWithBid]);
      } else {
        setPoints1((prev) => prev - currentBid);
        setTeam1Players((prev) => [...prev, playerWithBid]);
      }
    }

    addBidToHistory({ action: "finalize", player: currentPlayer });
    setSelectedPlayers((prev) => [...prev, currentPlayer.id]);
    setPlayers((prev) => prev.filter((p) => p.id !== currentPlayer.id));

    // Move to next player or end game
    if (players.length > 1) {
      setCurrentPlayerIndex(0);
      setMessage(`${players[1].name} (Current Bid: 10 pts)`);
    } else {
      setMessage("Bidding complete! All players assigned.");
    }

    setCurrentBid(10);
  };

  return (
    <div
      className="font-sans text-center p-6 bg-base-100 min-h-screen"
      style={{
        backgroundImage: "url('https://wallpaperaccess.com/full/1088620.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "rgba(255, 255, 255, 0.8)", // White overlay with opacity
        backgroundBlendMode: "overlay", // Blend the color with the background
      }}
    >
      <h1 className="text-3xl font-bold text-gray-800">
        🏆 Flodata Cricket League 🏆
      </h1>

      {!players.length && !selectedPlayers.length ? (
        <div className="p-6 bg-transparent rounded-lg shadow-md w-1/2 mx-auto">
          <h2 className="text-xl font-semibold">Captains</h2>
          <input
            type="text"
            placeholder="Enter Captain 1 Name"
            value={captain1}
            onChange={(e) => setCaptain1(e.target.value)}
            className="input input-bordered w-4/5 my-2 font-bold"
          />
          <input
            type="text"
            placeholder="Enter Captain 2 Name"
            value={captain2}
            onChange={(e) => setCaptain2(e.target.value)}
            className="input input-bordered w-4/5 my-2 font-bold"
          />
          <input
            type="number"
            placeholder="Number of Players (Even)"
            value={playerCount}
            onBlur={() =>
              setPlayerCount(playerCount % 2 === 0 ? playerCount : 10)
            }
            onChange={(e) => setPlayerCount(parseInt(e.target.value) || 10)}
            className="input input-bordered w-4/5 my-2 font-bold"
          />
          <h3 className="text-lg font-medium">Player Names:</h3>
          {Array.from({ length: playerCount }).map((_, i) => (
            <div className="flex justify-center" key={i}>
              <input
                type="text"
                placeholder={`Player ${i + 1}`}
                value={playerNames[i] || ""}
                onChange={(e) => {
                  const newNames = [...playerNames];
                  newNames[i] = e.target.value;
                  setPlayerNames(newNames);
                }}
                className="input input-bordered w-4/5 my-1 font-bold"
              />
            </div>
          ))}
          <br />
          <button onClick={startGame} className="btn btn-success mt-4">
            Start Bidding
          </button>
        </div>
      ) : (
        <div>
          <div className="mt-6 grid gap-4 grid-cols-2">
            <div
              className={`p-6 border rounded-lg shadow-lg ${
                currentCaptain === 1 ? "bg-green-100" : "bg-red-100"
              }`}
            >
              <h2 className="text-xl font-semibold relative">
                🏅 Team I Captain: {captain1} (Points: {points1}) |{" "}
                <span className="flex items-center absolute right-44 top-0 gap-3 text-red-400 text-2xl">
                  <IoWalletSharp className="text-orange-900 text-2xl" />{" "}
                  {points1 - currentBid > 0 ? points1 - currentBid : "🚫"}
                </span>{" "}
                {currentCaptain === 1 && (
                  <span className="absolute right-0 top-[-10px]">
                    <ImHammer2 className="text-[60px] text-blue-800" />
                  </span>
                )}
              </h2>
              {/* <h3></h3> */}
              <ul>
                {team1Players.map((player) => (
                  <li key={player.id} className="my-2">
                    {player.name} (Bid: {player.value} pts)
                  </li>
                ))}
              </ul>
            </div>
            <div
              className={`p-6 border rounded-lg shadow-lg ${
                currentCaptain === 2 ? "bg-green-100" : "bg-red-100"
              }`}
            >
              <h2 className="text-xl font-semibold relative">
                🏅 Team II Captain: {captain2} (Points: {points2}) |{" "}
                <span className="flex items-center absolute right-44 top-0 gap-3 text-red-400 text-2xl">
                  <IoWalletSharp className="text-orange-900 text-2xl" />{" "}
                  {points2 - currentBid > 0 ? points2 - currentBid : "🚫"}
                </span>{" "}
                {currentCaptain === 2 && (
                  <span className="absolute right-0 top-[-10px]">
                    <ImHammer2 className="text-[60px] text-blue-800" />
                  </span>
                )}
              </h2>
              <ul>
                {team2Players.map((player) => (
                  <li key={player.id} className="my-2">
                    {player.name} (Bid: {player.value} pts)
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-medium text-blue-600">
              🎯 Current Player for Bidding 🎯
            </h2>
            <p
              className={`text-lg font-semibold ${
                message.includes("complete") ? "text-red-500" : "text-gray-700"
              }`}
            >
              {message}
            </p>
            <div className="mt-4 space-x-4">
              {points1 >= 10 && points2 >= 10 && !firstSkip && (
                <>
                  <button
                    onClick={placeBid}
                    disabled={
                      message.includes("complete") ||
                      currentBid > 145 ||
                      currentCaptain === 1
                        ? points1 <= currentBid
                        : points2 <= currentBid
                    }
                    className="btn btn-primary"
                  >
                    Place Bid (+5 Points)
                  </button>
                  <button
                    onClick={finalizeBid}
                    disabled={!isBidOrSkipp}
                    className="btn btn-warning"
                  >
                    Withdraw the bid
                  </button>
                </>
              )}
              {(points1 < 10 || points2 < 10 || firstSkip) && (
                <button onClick={keepBid} className="btn btn-warning">
                  Keep This Player
                </button>
              )}
              <button
                onClick={points1 < 10 || points2 < 10 ? directskip : skipPlayer}
                disabled={message.includes("complete") || isBid}
                className="btn btn-error"
              >
                Skip Now
              </button>
              {points1 < currentBid &&
                points2 < currentBid &&
                players.length > 0 && (
                  <button
                    onClick={assignRemainingPlayersRandomly}
                    className="btn btn-secondary"
                  >
                    Assign Remaining Players Randomly
                  </button>
                )}
            </div>
          </div>

          <div className="mt-8 p-4 bg-transparent rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Bid History</h3>
            <div className="h-60 overflow-y-auto">
              {bidHistory
                .sort(
                  (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime()
                )
                .map((entry, index) => (
                  <div key={index} className="text-sm p-1 border-b">
                    <span className="font-medium">{entry.player}</span> -
                    {entry.action === "bid"
                      ? ` Captain ${entry.captain} bid ${entry.bid} pts`
                      : ` ${entry.action} by Captain ${entry.captain}`}{" "}
                    - {new Date(entry.timestamp).toLocaleTimeString()}
                  </div>
                ))}
            </div>
          </div>

          <button onClick={resetBidding} className="btn btn-error m-4">
            Reset Bidding
          </button>
        </div>
      )}
    </div>
  );
};

export default PlayerBiddingGame;
