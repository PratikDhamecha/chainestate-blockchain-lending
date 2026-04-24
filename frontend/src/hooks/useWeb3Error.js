export function parseWeb3Error(err) {
  let message = err.message || "An unknown error occurred.";

  if (err.info && err.info.error && err.info.error.message) {
    message = err.info.error.message;
  } else if (err.error && err.error.message) {
    message = err.error.message;
  } else if (err.reason) {
    message = err.reason;
  }

  // Handle common MetaMask rejection
  if (err.code === "ACTION_REJECTED" || message.includes("User denied")) {
    return new Error("Transaction was rejected by the user.");
  }

  // Clean up execution reverted messages
  const revertMatch = message.match(/execution reverted: (.*?)"/);
  if (revertMatch && revertMatch[1]) {
    return new Error(revertMatch[1]);
  }

  return new Error(message);
}
