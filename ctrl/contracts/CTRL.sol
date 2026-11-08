// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Valueless test token. This is intentionally not the eventual launch token.
contract CTRLTestToken is ERC20, ERC20Burnable {
    mapping(address => uint256) public lastClaim;
    uint256 public constant FAUCET_AMOUNT = 100 ether;
    error TestnetOnly();
    error FaucetCooldown();
    constructor() ERC20("CTRL Test Credits", "tCTRL") {
        if (block.chainid != 84532 && block.chainid != 31337) revert TestnetOnly();
    }
    function faucet() external {
        if (lastClaim[msg.sender] != 0 && block.timestamp < lastClaim[msg.sender] + 1 days) revert FaucetCooldown();
        lastClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}

interface IBurnable { function burn(uint256 amount) external; }

/// @notice FIFO wall-clock reservations. Activation buys access; unactivated tickets are refundable.
contract CTRLTurns is ReentrancyGuard {
    using SafeERC20 for IERC20;
    IERC20 public token;
    uint256 public constant PRICE = 10 ether;
    uint64 public constant DURATION = 60;
    uint64 public constant MAX_WAIT = 600;
    uint64 public nextStart;
    uint256 public ticketCount;
    struct Ticket { address player; uint64 startsAt; uint64 endsAt; bool activated; bool cancelled; }
    mapping(uint256 => Ticket) public tickets;
    mapping(address => uint256) public latestTicket;
    error TestnetOnly(); error InvalidToken(); error AlreadyQueued(); error QueueFull();
    error NotOwner(); error NotYourTime(); error TicketUsed();
    event Booked(uint256 indexed ticketId,address indexed player,uint64 startsAt,uint64 endsAt);
    event Activated(uint256 indexed ticketId,address indexed player,uint256 amountBurned);
    event Refunded(uint256 indexed ticketId,address indexed player,uint256 amount);
    constructor(address tokenAddress) {
        if(block.chainid!=84532 && block.chainid!=31337) revert TestnetOnly();
        if(tokenAddress.code.length==0) revert InvalidToken();
        token=IERC20(tokenAddress);
    }
    function bookTurn() external nonReentrant returns(uint256 id) {
        Ticket storage prior=tickets[latestTicket[msg.sender]];
        if(prior.player!=address(0) && !prior.cancelled && block.timestamp<prior.endsAt) revert AlreadyQueued();
        uint64 start=uint64(block.timestamp)>nextStart?uint64(block.timestamp):nextStart;
        if(start>block.timestamp+MAX_WAIT) revert QueueFull();
        token.safeTransferFrom(msg.sender,address(this),PRICE);
        id=++ticketCount;
        tickets[id]=Ticket(msg.sender,start,start+DURATION,false,false);
        latestTicket[msg.sender]=id;
        nextStart=start+DURATION;
        emit Booked(id,msg.sender,start,start+DURATION);
    }
    function activate(uint256 id) external nonReentrant {
        Ticket storage t=tickets[id];
        if(t.player!=msg.sender) revert NotOwner();
        if(t.activated||t.cancelled) revert TicketUsed();
        if(block.timestamp<t.startsAt||block.timestamp>=t.endsAt) revert NotYourTime();
        t.activated=true;
        IBurnable(address(token)).burn(PRICE);
        emit Activated(id,msg.sender,PRICE);
    }
    function refund(uint256 id) external nonReentrant {
        Ticket storage t=tickets[id];
        if(t.player!=msg.sender) revert NotOwner();
        if(t.activated||t.cancelled) revert TicketUsed();
        t.cancelled=true;
        token.safeTransfer(msg.sender,PRICE);
        emit Refunded(id,msg.sender,PRICE);
    }
}
