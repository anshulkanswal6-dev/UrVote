// ===== Contract Details =====
const CONTRACT_ADDRESS = "0xEA632d060Da72A866DB06f8072287150fB69bd91";

const CONTRACT_ABI = [
  {
    inputs: [
      { internalType: "string", name: "_question", type: "string" },
      { internalType: "string[]", name: "_options", type: "string[]" },
      { internalType: "uint256", name: "_durationSeconds", type: "uint256" },
    ],
    name: "createPoll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "pollId", type: "uint256" },
      { indexed: false, internalType: "string", name: "question", type: "string" },
      { indexed: false, internalType: "uint256", name: "endTime", type: "uint256" },
    ],
    name: "PollCreated",
    type: "event",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_pollId", type: "uint256" },
      { internalType: "uint256", name: "_optionIndex", type: "uint256" },
    ],
    name: "vote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "pollId", type: "uint256" },
      { indexed: false, internalType: "address", name: "voter", type: "address" },
      { indexed: false, internalType: "uint256", name: "optionIndex", type: "uint256" },
    ],
    name: "VoteCast",
    type: "event",
  },
  {
    inputs: [],
    name: "getPollCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_pollId", type: "uint256" }],
    name: "getPollEndTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_pollId", type: "uint256" }],
    name: "getPollOptions",
    outputs: [{ internalType: "string[]", name: "", type: "string[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_pollId", type: "uint256" }],
    name: "getPollQuestion",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_pollId", type: "uint256" },
      { internalType: "uint256", name: "_optionIndex", type: "uint256" },
    ],
    name: "getPollVotes",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_pollId", type: "uint256" }],
    name: "getWinningOption",
    outputs: [
      { internalType: "string", name: "winner", type: "string" },
      { internalType: "uint256", name: "votesCount", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_pollId", type: "uint256" },
      { internalType: "address", name: "_user", type: "address" },
    ],
    name: "hasUserVoted",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "polls",
    outputs: [
      { internalType: "string", name: "question", type: "string" },
      { internalType: "uint256", name: "endTime", type: "uint256" },
      { internalType: "bool", name: "exists", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// ===== Global State =====
let provider;
let signer;
let contract;
let currentAccount = null;
const activeIntervals = {};

// ===== DOM Elements =====
const connectBtn = document.getElementById("connectBtn");
const createPollBtn = document.getElementById("createPollBtn");
const walletAddress = document.getElementById("walletAddress");

// ===== Init =====
async function init() {
  // Only run in browser
  if (typeof window === 'undefined') {
    return;
  }

  if (typeof window.ethereum === "undefined") {
    console.log("Web3 wallet not detected");
    // Still try to load polls in read-only mode
    await loadPolls();
    return;
  }

  try {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    const accounts = await provider.listAccounts();
    if (accounts.length > 0) {
      currentAccount = accounts[0];
      updateUI();
    } else {
      // still load polls in read-only mode
      await loadPolls();
    }

    setupEventListeners();
  } catch (err) {
    console.error("Error initializing app:", err);
    // Still try to load polls in read-only mode
    await loadPolls();
  }
}

function setupEventListeners() {
  connectBtn.addEventListener("click", connectWallet);
  createPollBtn.addEventListener("click", createPoll);

  if (window.ethereum) {
    window.ethereum.on("accountsChanged", (accounts) => {
      if (accounts.length === 0) {
        currentAccount = null;
      } else {
        currentAccount = accounts[0];
      }
      updateUI();
    });

    window.ethereum.on("chainChanged", () => {
      window.location.reload();
    });
  }
}

// ===== Wallet / UI =====
async function connectWallet() {
  if (typeof window.ethereum === "undefined") {
    alert("Please install MetaMask or another Web3 wallet to connect!");
    window.open("https://metamask.io/download.html", "_blank");
    return;
  }

  try {
    connectBtn.disabled = true;
    connectBtn.textContent = "Connecting...";

    // Request account access if needed
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    
    if (accounts.length === 0) {
      throw new Error("No accounts found. Please make sure your wallet is unlocked.");
    }
    
    currentAccount = accounts[0];
    
    // Re-initialize provider and contract with the new account
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    
    await updateUI();
    await loadPolls();
    
  } catch (err) {
    console.error("Error connecting wallet:", err);
    alert(`Failed to connect wallet: ${err.message || 'Unknown error'}`);
    connectBtn.textContent = "Connect Wallet";
  } finally {
    connectBtn.disabled = false;
  }
}

function updateUI() {
  if (currentAccount) {
    const shortAddress = `${currentAccount.slice(0, 6)}...${currentAccount.slice(
      -4
    )}`;
    connectBtn.textContent = "Connected";
    walletAddress.textContent = shortAddress;
    walletAddress.title = currentAccount;
  } else {
    connectBtn.textContent = "Connect Wallet";
    walletAddress.textContent = "";
  }
  connectBtn.disabled = false;

  // Always reload polls (read-only even if not connected)
  loadPolls();
}

// ===== Poll Loading =====
async function loadPolls() {
  const activeContainer = document.getElementById("activePollsContainer");
  const pastContainer = document.getElementById("pastPollsContainer");

  if (!activeContainer || !pastContainer) {
    console.error("Containers not found");
    return;
  }

  // Show loading state
  activeContainer.innerHTML = '<div class="loading-marker">Loading polls...</div>';
  pastContainer.innerHTML = '';

  // If contract isn't initialized, try to initialize it in read-only mode
  if (!contract && typeof window.ethereum !== 'undefined') {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    } catch (err) {
      console.error("Error initializing read-only contract:", err);
      activeContainer.innerHTML = '<p class="error-message">Error: Could not connect to the blockchain. Please try again later.</p>';
      return;
    }
  } else if (!contract) {
    activeContainer.innerHTML = '<p class="error-message">Error: Web3 provider not available. Please install MetaMask or another Web3 wallet.</p>';
    return;
  }

  // Clear existing timers before loading new ones
  clearAllTimers();

  let count = 0;
  try {
    const pollCount = await contract.getPollCount();
    if (pollCount) {
      count = pollCount.toNumber();
    }
  } catch (err) {
    console.warn("Could not get poll count, defaulting to 0:", err);
    // Continue with count = 0 to allow other functionality to work
  }

  const nowTs = Math.floor(Date.now() / 1000);
  let activeHtml = "";
  let pastHtml = "";

  for (let pollId = 0; pollId < count; pollId++) {
    try {
      const question = await contract.getPollQuestion(pollId);
      const options = await contract.getPollOptions(pollId);
      const endTimeBn = await contract.getPollEndTime(pollId);
      const endTime = endTimeBn.toNumber();
      const isActive = nowTs < endTime;

      // Votes
      const votes = [];
      let totalVotes = 0;
      for (let i = 0; i < options.length; i++) {
        const v = await contract.getPollVotes(pollId, i);
        const num = v.toNumber();
        votes.push(num);
        totalVotes += num;
      }

      // Has user already voted?
      let hasVoted = false;
      if (currentAccount) {
        hasVoted = await contract.hasUserVoted(pollId, currentAccount);
      }

      // Build options HTML
      let optionsHtml = "";
      // Get user's voted option if they've voted
      let userVotedOption = null;
      if (hasVoted && currentAccount) {
        try {
          // This assumes your contract has a mapping to track which option a user voted for
          // If not, you'll need to modify your contract to include this functionality
          userVotedOption = await contract.getUserVote(pollId, currentAccount);
          userVotedOption = userVotedOption.toNumber();
        } catch (e) {
          console.log("Couldn't get user's voted option:", e);
        }
      }

      for (let i = 0; i < options.length; i++) {
        const voteCount = votes[i];
        const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
        const showVoteButton = isActive && !hasVoted && currentAccount;
        const isUserVotedOption = userVotedOption === i;

        optionsHtml += `
          <div class="option" ${isUserVotedOption ? 'data-voted="true"' : ''}>
            <div class="option-header">
              <span>${options[i]}</span>
              <span class="vote-count">${voteCount} vote${
          voteCount === 1 ? "" : "s"
        }</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${percentage}%;"></div>
            </div>
            <div class="percentage">${percentage.toFixed(1)}%</div>
            ${
              showVoteButton
                ? `<button class="vote-btn" onclick="vote(${pollId}, ${i}, this)">Vote</button>`
                : (hasVoted && isUserVotedOption) 
                  ? '<div class="voted-indicator">Your Vote ✓</div>' 
                  : ''
            }
          </div>
        `;
      }

      // Winner (for ended polls)
      let winnerHtml = "";
      if (!isActive && options.length > 0) {
        try {
          const [winnerName, votesCountBn] = await contract.getWinningOption(pollId);
          const votesCount = votesCountBn.toNumber();
          let displayWinner = "No winner (tie or no votes)";
          
          // Only show winner if there are votes
          if (votesCount > 0) {
            displayWinner = winnerName && winnerName.trim() !== "" ? 
              winnerName : "No clear winner (tie)";
              
            // Highlight the winning option
            for (let i = 0; i < options.length; i++) {
              if (options[i] === winnerName) {
                optionsHtml = optionsHtml.replace(
                  `<div class="option" data-option-index="${i}"`, 
                  `<div class="option winner-option" data-option-index="${i}"`
                );
                break;
              }
            }
          }

          winnerHtml = `
            <div class="poll-winner" style="
              margin: 1.5rem 0 0.5rem 0;
              padding: 1rem;
              background: rgba(74, 222, 128, 0.15);
              border: 1px solid rgba(74, 222, 128, 0.2);
              border-radius: 0.5rem;
              color: #10b981;
              font-weight: 600;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 0.5rem;
              animation: fadeIn 0.5s ease-in-out;
            ">
              <span style="font-size: 1.5rem;"></span>
              <div style="text-align: center;">
                <div style="font-size: 1.1em; margin-bottom: 0.25rem;">Poll Ended</div>
                <div>MAX VOTES ON: <strong>${displayWinner}</strong> (${votesCount} vote${votesCount === 1 ? '' : 's'})</div>
              </div>
            </div>
            <style>
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .winner-option {
                border: 2px solid #10b981 !important;
                background: rgba(16, 185, 129, 0.05) !important;
              }
              .winner-option .option-header {
                font-weight: 600;
              }
            </style>
          `;
        } catch (err) {
          console.error("Error getting winner:", err);
          winnerHtml = `
            <div class="poll-winner" style="
              margin-top: 1.5rem;
              padding: 1rem;
              background: rgba(248, 113, 113, 0.1);
              border: 1px solid rgba(248, 113, 113, 0.2);
              border-radius: 0.5rem;
              color: #ef4444;
              font-weight: 500;
              text-align: center;
            ">
              Could not determine winner. Please refresh the page.
            </div>
          `;
        }
      }

      // Create a unique ID for each timer element
      const timerId = `timer-${pollId}`;
      
      const cardHtml = `
        <div class="poll-card" id="poll-${pollId}">
          <h3>${question}</h3>
          <div class="poll-timer" id="${timerId}">
            ${isActive ? "Ends in: --:--:--" : "Ended"}
          </div>
          <div class="poll-options" id="options-${pollId}">
            ${optionsHtml || "<p>No options</p>"}
          </div>
          ${winnerHtml}
        </div>
      `;
      
      // If this is an active poll, start the timer immediately
      if (isActive) {
        // Use setTimeout to ensure the DOM is updated before starting the timer
        setTimeout(() => {
          const timerElement = document.getElementById(timerId);
          if (timerElement) {
            startPollTimer(pollId, endTime);
          } else {
            console.error(`Timer element not found: ${timerId}`);
          }
        }, 0);
      }

      if (isActive) {
        activeHtml += cardHtml;
      } else {
        pastHtml += cardHtml;
      }
    } catch (err) {
      console.error(`Error loading poll ${pollId}:`, err);
    }
  }

  // Only update the DOM if we have new content
  if (activeContainer) {
    activeContainer.innerHTML = activeHtml || "<p>No active polls</p>";
  }
  if (pastContainer) {
    pastContainer.innerHTML = pastHtml || "<p>No past polls</p>";
  }
}

// ===== Timers =====
function clearAllTimers() {
  // Clear all active intervals
  Object.values(activeIntervals).forEach(intervalId => {
    if (intervalId) clearInterval(intervalId);
  });
  // Clear the intervals object
  Object.keys(activeIntervals).forEach(key => delete activeIntervals[key]);
}

function startPollTimer(pollId, endTime) {
  try {
    const timerEl = document.getElementById(`timer-${pollId}`);
    if (!timerEl) return;

    // Clear any existing interval for this poll
    if (activeIntervals[pollId]) {
      clearInterval(activeIntervals[pollId]);
      delete activeIntervals[pollId];
    }

    const updateTimer = () => {
      try {
        const now = Math.floor(Date.now() / 1000);
        const remaining = endTime - now;

        if (remaining > 0) {
          const hours = Math.floor(remaining / 3600);
          const minutes = Math.floor((remaining % 3600) / 60);
          const seconds = remaining % 60;

          const timeString = `Ends in: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          
          // Only update if the element still exists
          if (document.body.contains(timerEl)) {
            timerEl.textContent = timeString;
          } else {
            // Clean up if element was removed
            clearInterval(activeIntervals[pollId]);
            delete activeIntervals[pollId];
          }
        } else {
          // Timer has ended
          clearInterval(activeIntervals[pollId]);
          delete activeIntervals[pollId];
          
          if (document.body.contains(timerEl)) {
            timerEl.textContent = "Ended";
            // Only reload polls if this is the first time we're seeing this poll end
            if (remaining > -5) { // Within 5 seconds of ending
              loadPolls();
            }
          }
        }
      } catch (err) {
        console.error('Error in timer update:', err);
        clearInterval(activeIntervals[pollId]);
        delete activeIntervals[pollId];
      }
    };

    // Initial update
    updateTimer();
    
    // Only set interval if the poll is still active
    const now = Math.floor(Date.now() / 1000);
    if (endTime > now) {
      activeIntervals[pollId] = setInterval(updateTimer, 1000);
    } else {
      timerEl.textContent = "Ended";
    }
  } catch (err) {
    console.error('Error starting timer:', err);
  }
}

// ===== Voting & Creating =====
async function vote(pollId, optionIndex, buttonElement) {
  if (!currentAccount) {
    alert("Please connect your wallet to vote.");
    return;
  }

  // Disable all vote buttons during transaction
  const voteButtons = document.querySelectorAll('.vote-btn');
  voteButtons.forEach(btn => btn.disabled = true);
  
  if (buttonElement) {
    buttonElement.textContent = 'Voting...';
    buttonElement.disabled = true;
  }

  try {
    // Show loading state
    const pollCard = document.getElementById(`poll-${pollId}`);
    if (pollCard) {
      const loadingIndicator = document.createElement('div');
      loadingIndicator.className = 'voting-loading';
      loadingIndicator.textContent = 'Processing your vote...';
      pollCard.appendChild(loadingIndicator);
    }

    const tx = await contract.vote(pollId, optionIndex);
    const receipt = await tx.wait();
    
    // Only reload if the transaction was successful
    if (receipt.status === 1) {
      // Show success feedback
      if (pollCard) {
        const successMsg = document.createElement('div');
        successMsg.className = 'voting-success';
        successMsg.textContent = 'Vote recorded successfully!';
        pollCard.appendChild(successMsg);
        
        // Remove messages after delay
        setTimeout(() => {
          if (pollCard.contains(loadingIndicator)) pollCard.removeChild(loadingIndicator);
          setTimeout(() => {
            if (pollCard.contains(successMsg)) pollCard.removeChild(successMsg);
          }, 2000);
        }, 1000);
      }
      
      // Reload polls to show updated state
      await loadPolls();
    } else {
      throw new Error('Transaction failed');
    }
  } catch (err) {
    console.error("Error voting:", err);
    
    // Show error message in the UI instead of alert
    const pollCard = document.getElementById(`poll-${pollId}`);
    if (pollCard) {
      const errorMsg = document.createElement('div');
      errorMsg.className = 'voting-error';
      errorMsg.textContent = err?.data?.message?.split("\n")[0] || 
                           err.message?.split("\n")[0] || 
                           'Failed to submit vote. Please try again.';
      pollCard.appendChild(errorMsg);
      
      // Remove error message after delay
      setTimeout(() => {
        if (pollCard.contains(errorMsg)) pollCard.removeChild(errorMsg);
      }, 5000);
    }
  } finally {
    // Re-enable vote buttons
    voteButtons.forEach(btn => {
      btn.disabled = false;
      btn.textContent = 'Vote';
    });
  }
}

async function createPoll() {
  const questionInput = document.getElementById("questionInput");
  const optionsInput = document.getElementById("optionsInput");
  const durationInput = document.getElementById("durationInput");

  const question = questionInput.value.trim();
  const options = optionsInput.value
    .split(",")
    .map((opt) => opt.trim())
    .filter((opt) => opt.length > 0);
  const duration = parseInt(durationInput.value, 10);

  if (!question) {
    alert("Please enter a question.");
    return;
  }
  if (options.length < 2) {
    alert("Please provide at least two options.");
    return;
  }
  if (isNaN(duration) || duration <= 0) {
    alert("Please enter a valid duration in seconds.");
    return;
  }
  if (!currentAccount) {
    alert("Please connect your wallet to create a poll.");
    return;
  }

  try {
    createPollBtn.disabled = true;
    createPollBtn.textContent = "Creating...";

    const tx = await contract.createPoll(question, options, duration);
    await tx.wait();

    questionInput.value = "";
    optionsInput.value = "";
    durationInput.value = "";

    await loadPolls();
  } catch (err) {
    console.error("Error creating poll:", err);
    alert(err?.data?.message || err?.message || "Failed to create poll.");
  } finally {
    createPollBtn.disabled = false;
    createPollBtn.textContent = "Create Poll";
  }
}

// expose vote for inline onclick
window.vote = vote;

// ===== On Page Load =====
window.addEventListener("load", () => {
  // Initialize the app
  init().catch(err => {
    console.error("Failed to initialize app:", err);
    alert("Failed to initialize the application. Please check the console for details.");
  });
});
