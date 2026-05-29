const readline = require("readline");
const { randomInt } = require("crypto");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ─────────────────────────────────────────────
// Magic 8-Ball Responses
// ─────────────────────────────────────────────
const RESPONSES = {
  positive: [
    "It is certain.",
    "It is decidedly so.",
    "Without a doubt.",
    "Yes, definitely.",
    "You may rely on it.",
    "As I see it, yes.",
    "Most likely.",
    "Outlook good.",
    "Yes.",
    "Signs point to yes.",
  ],
  neutral: [
    "Reply hazy, try again.",
    "Ask again later.",
    "Better not tell you now.",
    "Cannot predict now.",
    "Concentrate and ask again.",
  ],
  negative: [
    "Don't count on it.",
    "My reply is no.",
    "My sources say no.",
    "Outlook not so good.",
    "Very doubtful.",
  ],
};

const ALL_RESPONSES = Object.entries(RESPONSES).flatMap(
  ([category, answers]) =>
    answers.map((text) => ({
      category,
      text,
    }))
);

// ─────────────────────────────────────────────
// Game State
// ─────────────────────────────────────────────
const stats = {
  questionsAsked: 0,
  positiveAnswers: 0,
  neutralAnswers: 0,
  negativeAnswers: 0,
};

const history = [];

let statusMessage = "Type any question to ask the Magic 8-Ball.";
let lastQuestion = "";
let lastAnswer = "";
let lastCategory = "";

// ─────────────────────────────────────────────
// CLI Helpers
// ─────────────────────────────────────────────
function ask(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer.trim()));
  });
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function clearScreen() {
  process.stdout.write("\x1Bc");
}

function isExitInput(input) {
  return ["e", "exit", "q", "quit"].includes(input.toLowerCase());
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getRandomResponse() {
  return ALL_RESPONSES[randomInt(0, ALL_RESPONSES.length)];
}

function recordResult(question, response) {
  stats.questionsAsked += 1;
  stats[`${response.category}Answers`] += 1;

  lastQuestion = question;
  lastAnswer = response.text;
  lastCategory = response.category;

  history.unshift({
    number: stats.questionsAsked,
    question,
    answer: response.text,
    category: response.category,
  });

  // Keep only the five newest results visible.
  if (history.length > 5) {
    history.pop();
  }
}

// ─────────────────────────────────────────────
// Screen Rendering
// ─────────────────────────────────────────────
function renderScreen() {
  clearScreen();

  console.log("════════════════════════════════════════════════════════");
  console.log("                 🎱 MAGIC 8-BALL 🎱");
  console.log("════════════════════════════════════════════════════════");
  console.log(
    ` Questions: ${stats.questionsAsked}   ` +
      `Positive: ${stats.positiveAnswers}   ` +
      `Neutral: ${stats.neutralAnswers}   ` +
      `Negative: ${stats.negativeAnswers}`
  );
  console.log("────────────────────────────────────────────────────────");

  if (lastAnswer) {
    console.log(` Last question: ${lastQuestion}`);
    console.log(` 8-Ball says:  "${lastAnswer}"`);
    console.log(` Answer type:  ${capitalize(lastCategory)}`);
  } else {
    console.log(" Ask the Magic 8-Ball anything.");
    console.log(" Example: Will I finish my project today?");
  }

  console.log("────────────────────────────────────────────────────────");
  console.log(` ${statusMessage}`);
  console.log("────────────────────────────────────────────────────────");

  if (history.length > 0) {
    console.log(" Recent Answers:");

    for (const item of history) {
      console.log(`  ${item.number}. ${item.question}`);
      console.log(`     → "${item.answer}"`);
    }

    console.log("────────────────────────────────────────────────────────");
  }

  console.log(" Type EXIT at any prompt to quit.");
  console.log("════════════════════════════════════════════════════════");
}

function renderShakingScreen(question, animation) {
  clearScreen();

  console.log("════════════════════════════════════════════════════════");
  console.log("                 🎱 MAGIC 8-BALL 🎱");
  console.log("════════════════════════════════════════════════════════");
  console.log(` Your question: ${question}`);
  console.log("────────────────────────────────────────────────────────");
  console.log(` 🔮 Shaking the Magic 8-Ball${animation}`);
  console.log("════════════════════════════════════════════════════════");
}

function renderExitScreen() {
  clearScreen();

  console.log("════════════════════════════════════════════════════════");
  console.log("                  🎱 SESSION OVER 🎱");
  console.log("════════════════════════════════════════════════════════");
  console.log(` Questions asked:   ${stats.questionsAsked}`);
  console.log(` Positive answers:  ${stats.positiveAnswers}`);
  console.log(` Neutral answers:   ${stats.neutralAnswers}`);
  console.log(` Negative answers:  ${stats.negativeAnswers}`);
  console.log("────────────────────────────────────────────────────────");
  console.log(" Thanks for playing Magic 8-Ball!");
  console.log("════════════════════════════════════════════════════════");
}

// ─────────────────────────────────────────────
// Game Logic
// ─────────────────────────────────────────────
async function shakeBall(question) {
  renderShakingScreen(question, ".");
  await wait(400);

  renderShakingScreen(question, "..");
  await wait(400);

  renderShakingScreen(question, "...");
  await wait(400);

  renderShakingScreen(question, "....");
  await wait(400);
}

async function getQuestion() {
  while (true) {
    renderScreen();

    const question = await ask("\n❓ Your question: ");

    if (isExitInput(question)) {
      return null;
    }

    // Fixed: questions no longer need to end with "?".
    if (question.length === 0) {
      statusMessage = "⚠ Please type a question before pressing Enter.";
      continue;
    }

    return question;
  }
}

async function askAnotherQuestion() {
  while (true) {
    const answer = (
      await ask("\nAsk another question? (Y/N): ")
    ).toLowerCase();

    if (["y", "yes"].includes(answer)) {
      statusMessage = "Type your next question.";
      return true;
    }

    if (["n", "no"].includes(answer) || isExitInput(answer)) {
      return false;
    }

    statusMessage = "⚠ Please enter Y or N.";
    renderScreen();
  }
}

async function startGame() {
  while (true) {
    const question = await getQuestion();

    if (question === null) {
      renderExitScreen();
      rl.close();
      return;
    }

    await shakeBall(question);

    const response = getRandomResponse();

    recordResult(question, response);

    statusMessage = "🎱 The Magic 8-Ball has answered.";

    renderScreen();

    const continuePlaying = await askAnotherQuestion();

    if (!continuePlaying) {
      renderExitScreen();
      rl.close();
      return;
    }
  }
}

// ─────────────────────────────────────────────
// Start Game
// ─────────────────────────────────────────────
startGame().catch((error) => {
  clearScreen();
  console.error("An unexpected error occurred:", error.message);
  rl.close();
});