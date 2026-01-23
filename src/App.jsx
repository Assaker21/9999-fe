import { EyeClosedIcon, EyeIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const DEVELOPMENT = false;
const socket = io(
  DEVELOPMENT ? "http://localhost:3000" : "https://nine999-api.onrender.com",
);

function generateShareText(guesses, userId, didWin) {
  const myGuesses = guesses.filter((g) => g.userId === userId);

  const rows = myGuesses.map((g) => {
    return "🟩".repeat(g.match) + "⬛".repeat(4 - g.match);
  });

  const attempts = didWin ? myGuesses.length + 1 : "X";

  if (didWin) {
    rows.push("🟩🟩🟩🟩");
  }

  return [`9999 — ${attempts}/∞`, "", ...rows].join("\n");
}

async function shareResult(text) {
  if (navigator.share) {
    await navigator.share({ text });
  } else {
    await navigator.clipboard.writeText(text);
    alert("Result copied to clipboard");
  }
}

export default function App() {
  const [username, setUsername] = useState("");
  const [secret, setSecret] = useState("");
  const [guess, setGuess] = useState("");

  const [userId, setUserId] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [turn, setTurn] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [winner, setWinner] = useState(null);

  const [guesses, setGuesses] = useState([]);
  const [viewNum, setViewNum] = useState(false);

  /* ---------------- SOCKET EVENTS ---------------- */

  useEffect(() => {
    socket.on("joined", ({ userId, gameId }) => {
      setUserId(userId);
      setGameId(gameId);
    });

    socket.on("game_start", ({ turn }) => {
      setTurn(turn);
      setGameStarted(true);
    });

    socket.on("attempt_result", ({ userId, guess, match, nextTurn }) => {
      setGuesses((prev) => [...prev, { guess, match, userId }]);
      setTurn(nextTurn);
      // setGuess("");
    });

    socket.on("game_over", ({ winner }) => {
      setWinner(winner);
    });

    socket.on("error", (msg) => {
      alert(msg);
    });

    return () => {
      socket.off();
    };
  }, []);

  /* ---------------- ACTIONS ---------------- */

  const joinGame = () => {
    if (!/^\d{4}$/.test(secret)) {
      alert("4-digit secret required");
      return;
    }

    socket.emit("join_game", { username: "", secret });
  };

  const submitGuess = () => {
    if (!/^\d{4}$/.test(guess)) return;

    socket.emit("attempt", {
      gameId,
      userId,
      guess,
    });

    setGuess("");
  };

  if (!userId) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-950 text-white gap-2">
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            joinGame();
          }}
        >
          <h1 className="w-full text-center text-8xl font-black pb-12 mt-[-100px]">
            9999
          </h1>
          {/* <input
            placeholder="Username"
            className="bg-gray-800 px-4 py-2 text-lg opacity-70 focus:outline-none hover:opacity-100 focus:opacity-100"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          /> */}
          <input
            placeholder="Your secret (4 digits)"
            className="bg-gray-800 px-4 py-2 text-lg opacity-70 focus:outline-none hover:opacity-100 focus:opacity-100"
            value={secret}
            onChange={(e) => {
              if (/^\d{0,4}$/.test(e.target.value)) {
                setSecret(e.target.value);
              }
            }}
            required
            autoFocus
          />
          <Button color="green" type="submit">
            Join Game
          </Button>
        </form>

        <div className="absolute bottom-2 left-[50%] transform-[translateX(-50%)] text-gray-300 text-sm font-medium z-10">
          built by{" "}
          <a href="https://charbxl.com" className="underline text-green-600">
            charbxl
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen w-full bg-gray-950 text-white gap-4">
      <h2 className="absolute top-8 left-[50%] transform-[translateX(-50%)] text-2xl flex flex-row gap-2 items-center justify-center font-semibold">
        {viewNum ? secret : "■■■■"}
        <button
          className="text-gray-200 flex items-center justify-center bg-gray-700 px-1 py-0.5 cursor-pointer hover:opacity-80"
          onClick={() => {
            setViewNum(!viewNum);
          }}
        >
          {!viewNum ? <EyeIcon /> : <EyeClosedIcon />}
        </button>
      </h2>

      {!gameStarted && (
        <h2 className="text-3xl font-medium">Waiting for opponent...</h2>
      )}

      {gameStarted && (
        <>
          {!winner && (
            <h2 className="text-2xl font-semibold">
              {turn === userId ? "Your turn" : "Opponent's turn"}
            </h2>
          )}

          {!winner ? (
            <form
              className={
                "flex flex-col border-2 " +
                (turn == userId ? "border-blue-600" : "border-transparent")
              }
              onSubmit={(e) => {
                e.preventDefault();
                submitGuess();
              }}
            >
              <input
                value={guess}
                className="w-70 text-center bg-gray-800 px-8 py-6 text-7xl opacity-100 focus:outline-none hover:opacity-100 focus:opacity-100 font-black"
                onChange={(e) => {
                  if (/^\d{0,4}$/.test(e.target.value)) {
                    setGuess(e.target.value);
                  }
                }}
                autoFocus
                required
              />
              <button
                type="submit"
                className="bg-blue-600 px-6 py-3 text-xl w-70 font-medium disabled:opacity-60"
                disabled={turn != userId} //!/^\d{4}$/.test(guess) ||
              >
                Submit Guess
              </button>
            </form>
          ) : (
            <>
              {winner && (
                <h2 className="text-4xl font-medium text-center flex flex-col gap-8 items-center justify-center">
                  {winner === -1 ? (
                    <>The other player disconnected</>
                  ) : winner === userId ? (
                    <>You guessed right! </>
                  ) : (
                    <>Your opponent guessed your number</>
                  )}
                  <br />

                  <button
                    className="bg-green-600 px-6 py-3 text-xl max-w-70 w-full font-medium disabled:opacity-60"
                    onClick={() => {
                      window.location.reload();
                    }}
                  >
                    Retry
                  </button>

                  {winner !== -1 ? (
                    <button
                      className="bg-blue-600 px-6 py-3 text-xl max-w-70 w-full font-medium disabled:opacity-60 mt-[-24px]"
                      onClick={() => {
                        const text = generateShareText(
                          guesses,
                          userId,
                          winner === userId,
                        );
                        shareResult(text);
                      }}
                    >
                      Share
                    </button>
                  ) : null}
                </h2>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-2">
            {guesses.map((g, i) =>
              g.userId === userId ? (
                <div key={i} className="flex flex-row w-34 ">
                  <div className="flex-1 px-4 py-1 text-md font-semibold bg-gray-800">
                    {g.guess}
                  </div>
                  <div
                    className={
                      "px-4 py-1 text-md font-semibold w-12 flex items-center justify-center bg-green-600"
                    }
                  >
                    {g.match}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </>
      )}

      <div className="absolute bottom-2 left-[50%] transform-[translateX(-50%)] text-gray-300 text-sm font-medium z-10">
        built by{" "}
        <a href="https://charbxl.com" className="underline text-green-600">
          charbxl
        </a>
      </div>
    </div>
  );
}

function Button({ children, color, ...props }) {
  return (
    <button
      {...props}
      className={
        (color == "green" ? "bg-green-600" : "bg-blue-600") +
        " px-4 py-2 text-lg hover:opacity-90 cursor-pointer font-medium"
      }
    >
      {children}
    </button>
  );
}
