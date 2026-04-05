// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * KYCRegistry
 * ─────────────────────────────────────────────────────
 * Stores KYC verification status on-chain per wallet.
 * Personal data (Aadhaar, photos) is stored OFF-chain in MongoDB.
 * Only the contract owner (admin/backend wallet) can approve or revoke KYC.
 *
 * LoanContract should call kycRegistry.isVerified(msg.sender)
 * before allowing requestLoan().
 */
contract KYCRegistry is Ownable {

    enum KYCStatus { NONE, PENDING, VERIFIED, REJECTED }

    struct KYCRecord {
        KYCStatus status;
        uint256   submittedAt;
        uint256   verifiedAt;
        string    kycId;        // MongoDB document ID (no personal data on-chain)
    }

    mapping(address => KYCRecord) private records;

    // ── Events ────────────────────────────────────────────────────────────────
    event KYCSubmitted(address indexed wallet, string kycId);
    event KYCVerified (address indexed wallet, string kycId);
    event KYCRejected (address indexed wallet, string kycId);
    event KYCRevoked  (address indexed wallet);

    constructor() {}

    // ── Called by user: mark their submission as PENDING ─────────────────────
    function submitKYC(string calldata kycId) external {
        require(
            records[msg.sender].status != KYCStatus.VERIFIED,
            "Already verified"
        );
        records[msg.sender] = KYCRecord({
            status:      KYCStatus.PENDING,
            submittedAt: block.timestamp,
            verifiedAt:  0,
            kycId:       kycId
        });
        emit KYCSubmitted(msg.sender, kycId);
    }

    // ── Called by admin: approve KYC ──────────────────────────────────────────
    function approveKYC(address wallet) external onlyOwner {
        require(records[wallet].status == KYCStatus.PENDING, "Not pending");
        records[wallet].status     = KYCStatus.VERIFIED;
        records[wallet].verifiedAt = block.timestamp;
        emit KYCVerified(wallet, records[wallet].kycId);
    }

    // ── Called by admin: reject KYC ───────────────────────────────────────────
    function rejectKYC(address wallet) external onlyOwner {
        require(records[wallet].status == KYCStatus.PENDING, "Not pending");
        records[wallet].status = KYCStatus.REJECTED;
        emit KYCRejected(wallet, records[wallet].kycId);
    }

    // ── Called by admin: revoke a previously verified KYC ────────────────────
    function revokeKYC(address wallet) external onlyOwner {
        records[wallet].status = KYCStatus.NONE;
        emit KYCRevoked(wallet);
    }

    // ── View functions ────────────────────────────────────────────────────────
    function isVerified(address wallet) external view returns (bool) {
        return records[wallet].status == KYCStatus.VERIFIED;
    }

    function getStatus(address wallet) external view returns (KYCStatus) {
        return records[wallet].status;
    }

    function getRecord(address wallet) external view returns (KYCRecord memory) {
        return records[wallet];
    }
}
