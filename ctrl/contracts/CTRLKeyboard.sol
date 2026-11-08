// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
interface ILegacyCredits {function balanceOf(address) external view returns(uint256);function lastClaim(address) external view returns(uint64);function playerState(address) external view returns(uint256,uint64,uint8,uint8,uint64,bytes32[] memory);}

/// @notice Non-transferable, valueless test credits; server-oracle randomness, not VRF.
/// @dev One paid ticket commits to ONE world command. Reveal never charges a second fee.
contract CTRLKeyboard is ERC20 {
 address public oracle; address public deployer; address public legacy;
 uint256 public developerCredits;
 bytes32 public constant QUOTE_TYPEHASH=keccak256("Keyboard(address buyer,bytes32 id,uint8 habitat,uint64 sequence,uint64 round,bytes32 actionHash,bytes32 commitment,uint8 flags,uint8 targets,uint64 deadline)");
 struct Quote {address buyer;bytes32 id;uint8 habitat;uint64 sequence;uint64 round;bytes32 actionHash;bytes32 commitment;uint8 flags;uint8 targets;uint64 deadline;}
 struct Ticket {Quote quote;uint64 boughtAt;uint8 status;}
 struct Pool {uint256 available;uint256 seedReserve;uint64 round;uint64 sequence;uint64 startedAt;uint64 turns;bytes32 active;}
 mapping(uint8=>Pool) public pools;
 mapping(bytes32=>Ticket) private tickets;
 mapping(address=>bool) public migrated;
 mapping(address=>uint64) public lastClaim;
 mapping(address=>uint64) public lastHole;
 mapping(address=>uint64[20]) private turns;
 mapping(address=>uint64[5]) private rewards;
 mapping(address=>mapping(uint8=>mapping(uint64=>uint256))) public contributions;
 event CreditsMigrated(address indexed player,uint256 amount,uint64 previousClaim);
 event CreditsClaimed(address indexed player,uint256 amount);
 event TurnBought(address indexed player,bytes32 indexed id,uint8 habitat,uint256 cost);
 event TurnExecuted(address indexed player,bytes32 indexed id,uint8 habitat,uint256 payout,bytes32 nonce,uint256 poolShare,uint256 devShare,uint64 round,uint64 sequence,uint8 flags,uint256 nextSeed);
 event TurnExpired(address indexed player,bytes32 indexed id,uint8 habitat,uint256 cost,uint256 poolShare,uint256 devShare,uint64 sequence);
 error InvalidTurn();error Cooldown();error LimitReached();error NotOwner();error NonTransferable();
 constructor(address signer,address previous) ERC20("CTRL Keyboard Credits","kCTRL") {
  require(signer!=address(0));oracle=signer;deployer=msg.sender;legacy=previous;
  pools[0]=Pool(300,9700,1,0,uint64(block.timestamp),0,0);
  pools[1]=Pool(300,49700,1,0,uint64(block.timestamp),0,0);_mint(address(this),60000);
 }
 function decimals() public pure override returns(uint8){return 0;}
 function transfer(address,uint256) public pure override returns(bool){revert NonTransferable();}
 function transferFrom(address,address,uint256) public pure override returns(bool){revert NonTransferable();}
 function approve(address,uint256) public pure override returns(bool){revert NonTransferable();}
 function price(uint8 h) public pure returns(uint256){require(h<2);return h==0?10:50;}
 function domainSeparator() public view returns(bytes32){return keccak256(abi.encode(keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),keccak256("CTRL Keyboard"),keccak256("1"),block.chainid,address(this)));}
 function migrate() public {
  if(migrated[msg.sender])return;migrated[msg.sender]=true;
  if(legacy!=address(0)){(,,,,,bytes32[] memory pending)=ILegacyCredits(legacy).playerState(msg.sender);require(pending.length==0,"Open legacy packs before migration");uint256 amount=ILegacyCredits(legacy).balanceOf(msg.sender);uint64 previousClaim=ILegacyCredits(legacy).lastClaim(msg.sender);lastClaim[msg.sender]=previousClaim;_mint(msg.sender,amount);emit CreditsMigrated(msg.sender,amount,previousClaim);}
 }
 function claimCredits() external {migrate();if(lastClaim[msg.sender]!=0&&block.timestamp<uint256(lastClaim[msg.sender])+1 days)revert Cooldown();lastClaim[msg.sender]=uint64(block.timestamp);_mint(msg.sender,1500);emit CreditsClaimed(msg.sender,1500);}
 function available(uint64[] memory timestamps) private view returns(uint8 count){for(uint256 i;i<timestamps.length;i++)if(timestamps[i]==0||block.timestamp>=uint256(timestamps[i])+1 days)count++;}
 function turnsLeft(address who) public view returns(uint8){uint64[] memory a=new uint64[](20);for(uint256 i;i<20;i++)a[i]=turns[who][i];return available(a);}
 function rewardsLeft(address who) public view returns(uint8){uint64[] memory a=new uint64[](5);for(uint256 i;i<5;i++)a[i]=rewards[who][i];return available(a);}
 function ticket(bytes32 id) external view returns(Quote memory,uint64,uint8){Ticket storage t=tickets[id];return(t.quote,t.boughtAt,t.status);}
 function buyTurn(Quote calldata q,bytes calldata signature) external {
  migrate();Pool storage p=pools[q.habitat];
  if(q.habitat>1||q.id==0||q.buyer!=msg.sender||q.deadline<block.timestamp||q.deadline>block.timestamp+5 minutes||q.sequence!=p.sequence||q.round!=p.round||p.active!=0||tickets[q.id].status!=0||q.flags>15||q.commitment==0)revert InvalidTurn();
  bytes32 sh=keccak256(abi.encode(QUOTE_TYPEHASH,q.buyer,q.id,q.habitat,q.sequence,q.round,q.actionHash,q.commitment,q.flags,q.targets,q.deadline));
  if(ECDSA.recover(keccak256(abi.encodePacked(hex"1901",domainSeparator(),sh)),signature)!=oracle)revert InvalidTurn();
  if(turnsLeft(msg.sender)==0)revert LimitReached();
  if(q.flags&2!=0){if(rewardsLeft(msg.sender)==0)revert LimitReached();if(contributions[msg.sender][q.habitat][q.round]==0)revert InvalidTurn();if(q.targets==0||q.targets>32)revert InvalidTurn();}
  if(q.flags&8!=0){if(q.flags&6!=6||p.turns<3||block.timestamp<uint256(p.startedAt)+90 seconds||(lastHole[msg.sender]!=0&&block.timestamp<uint256(lastHole[msg.sender])+1 days))revert Cooldown();}
  for(uint256 i;i<20;i++)if(turns[msg.sender][i]==0||block.timestamp>=uint256(turns[msg.sender][i])+1 days){turns[msg.sender][i]=uint64(block.timestamp);break;}
  if(q.flags&2!=0){contributions[msg.sender][q.habitat][q.round]--;for(uint256 i;i<5;i++)if(rewards[msg.sender][i]==0||block.timestamp>=uint256(rewards[msg.sender][i])+1 days){rewards[msg.sender][i]=uint64(block.timestamp);break;}}
  if(q.flags&8!=0)lastHole[msg.sender]=uint64(block.timestamp);
  _transfer(msg.sender,address(this),price(q.habitat));p.active=q.id;tickets[q.id]=Ticket(q,uint64(block.timestamp),1);emit TurnBought(msg.sender,q.id,q.habitat,price(q.habitat));
 }
 function executeTurn(bytes32 id,uint256 payout,bytes32 nonce) external {
  Ticket storage t=tickets[id];Quote storage q=t.quote;Pool storage p=pools[q.habitat];
  if(q.buyer!=msg.sender)revert NotOwner();if(t.status!=1||p.active!=id||block.timestamp>=uint256(t.boughtAt)+5 minutes||keccak256(abi.encodePacked(id,payout,nonce))!=q.commitment)revert InvalidTurn();
  uint256 cost=price(q.habitat);uint256 poolShare=cost*80/100;uint256 devShare=cost-poolShare;
  if(payout>p.available+poolShare||(q.flags&2==0&&payout!=0)||payout>uint256(q.targets)*(q.habitat==0?80:400))revert InvalidTurn();
  if(q.flags&1!=0)contributions[msg.sender][q.habitat][p.round]++;
  t.status=2;p.active=0;p.available+=poolShare;p.available-=payout;p.sequence++;p.turns++;developerCredits+=devShare;
  uint64 round=p.round;uint256 seed;
  if(q.flags&4!=0){p.round++;p.turns=0;p.startedAt=uint64(block.timestamp);seed=p.seedReserve>=300?300:p.seedReserve;p.seedReserve-=seed;p.available+=seed;}
  if(payout>0)_transfer(address(this),msg.sender,payout);_transfer(address(this),deployer,devShare);
  emit TurnExecuted(msg.sender,id,q.habitat,payout,nonce,poolShare,devShare,round,p.sequence,q.flags,seed);
 }
 function expireTurn(bytes32 id) external {Ticket storage t=tickets[id];if(t.status!=1||block.timestamp<uint256(t.boughtAt)+5 minutes)revert Cooldown();t.status=3;Pool storage p=pools[t.quote.habitat];p.active=0;p.sequence++;uint256 cost=price(t.quote.habitat);uint256 poolShare=cost*80/100;uint256 devShare=cost-poolShare;p.available+=poolShare;developerCredits+=devShare;_transfer(address(this),deployer,devShare);emit TurnExpired(t.quote.buyer,id,t.quote.habitat,cost,poolShare,devShare,p.sequence);}
}
