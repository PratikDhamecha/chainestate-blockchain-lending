// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PropertyShares is ERC1155, Ownable {

    uint256 public propertyCounter;

    struct Property {
        string  name;
        string  location;
        uint256 totalShares;
        uint256 pricePerShare;
        bool    active;
    }

    mapping(uint256 => Property) public properties;

    event PropertyListed(uint256 indexed propertyId, string name, uint256 totalShares);

    constructor() ERC1155("") {}

    // ── Admin lists a new property and mints shares ───────────────────────────
    function listProperty(
        string  calldata name,
        string  calldata location,
        uint256 totalShares,
        uint256 pricePerShare
    ) external onlyOwner returns (uint256) {
        require(totalShares > 0,   "Invalid shares");
        require(pricePerShare > 0, "Invalid price");

        propertyCounter++;

        properties[propertyCounter] = Property({
            name:          name,
            location:      location,
            totalShares:   totalShares,
            pricePerShare: pricePerShare,
            active:        true
        });

        _mint(msg.sender, propertyCounter, totalShares, "");

        emit PropertyListed(propertyCounter, name, totalShares);
        return propertyCounter;
    }

    // ── Borrower buys shares from admin ───────────────────────────────────────
    function buyShares(uint256 propertyId, uint256 amount) external payable {
        Property storage prop = properties[propertyId];
        require(prop.active,  "Property not active");
        require(amount > 0,   "Invalid amount");
        require(msg.value == prop.pricePerShare * amount, "Wrong ETH amount");

        address owner = owner();
        require(
            balanceOf(owner, propertyId) >= amount,
            "Not enough shares available"
        );

        _safeTransferFrom(owner, msg.sender, propertyId, amount, "");

        (bool success, ) = payable(owner).call{value: msg.value}("");
        require(success, "ETH transfer failed");
    }

    // ── View property details ─────────────────────────────────────────────────
    function getProperty(uint256 propertyId) external view returns (Property memory) {
        return properties[propertyId];
    }
}