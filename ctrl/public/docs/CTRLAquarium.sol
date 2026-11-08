// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @notice Valueless, non-transferable test credits. NOT a production gambling contract.
/// @dev The server oracle chooses outcomes; commitments prove consistency, not fair RNG.
contract CTRLAquarium is ERC20 {
    address public oracle;
    address public deployer;
    bytes32 public constant QUOTE_TYPEHASH=keccak256("Purchase(address buyer,bytes32 packId,uint8 habitat,uint8 species,bytes32 commitment,uint64 deadline)");
    struct Purchase {address buyer;bytes32 packId;uint8 habitat;uint8 species;bytes32 commitment;uint64 deadline;}
    struct Pack {address owner;uint8 habitat;uint8 species;bytes32 commitment;uint64 maturesAt;bool opened;}
    struct Pool {uint256 remaining;uint256 reserved;uint64 round;uint64 collapsedAt;}
    mapping(bytes32=>Pack) public packs;
    mapping(uint8=>Pool) public pools;
    mapping(address=>uint64) public lastClaim;
    mapping(address=>uint64) public lastHole;
    mapping(address=>uint64[3]) private bought;
    mapping(address=>uint64[3]) private opened;
    mapping(address=>bytes32[]) private pending;
    event CreditsClaimed(address indexed player,uint256 amount);
    event PackBought(address indexed player,bytes32 indexed packId,uint8 habitat,uint8 species,bytes32 commitment,uint64 maturesAt);
    event PackOpened(address indexed player,bytes32 indexed packId,uint8 habitat,uint256 payout,bytes32 nonce);
    event RoundCollapsed(address indexed player,uint8 habitat,uint64 round,uint256 fee);
    error NotReady(); error NotOwner(); error LimitReached(); error InvalidQuote(); error InvalidReveal(); error ReserveLow(); error Cooldown(); error NonTransferable();
    constructor(address signer) ERC20("CTRL Test Credits","tCTRL") {
        require(signer!=address(0));oracle=signer;deployer=msg.sender;
        pools[0]=Pool(10000,0,1,0);pools[1]=Pool(50000,0,1,0);_mint(address(this),60000);
    }
    function domainSeparator() public view returns(bytes32){return keccak256(abi.encode(keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),keccak256("CTRL Aquarium"),keccak256("1"),block.chainid,address(this)));}
    function decimals() public pure override returns(uint8){return 0;}
    // No external transfer, delegated transfer, approval, trade or cash-out path.
    function transfer(address,uint256) public pure override returns(bool){revert NonTransferable();}
    function transferFrom(address,address,uint256) public pure override returns(bool){revert NonTransferable();}
    function approve(address,uint256) public pure override returns(bool){revert NonTransferable();}
    function available(uint64[3] memory times) private view returns(uint8 count){for(uint256 i;i<3;i++)if(times[i]==0||block.timestamp>=uint256(times[i])+1 days)count++;}
    function stamp(uint64[3] storage times) private {for(uint256 i;i<3;i++)if(times[i]==0||block.timestamp>=uint256(times[i])+1 days){times[i]=uint64(block.timestamp);return;}revert LimitReached();}
    function playerState(address who) external view returns(uint256 balance,uint64 claimAt,uint8 purchasesLeft,uint8 opensLeft,uint64 holeAt,bytes32[] memory active){
        return(balanceOf(who),lastClaim[who]==0?0:lastClaim[who]+1 days,available(bought[who]),available(opened[who]),lastHole[who]==0?0:lastHole[who]+1 days,pending[who]);
    }
    function claimCredits() external {
        if(lastClaim[msg.sender]!=0&&block.timestamp<uint256(lastClaim[msg.sender])+1 days)revert Cooldown();
        lastClaim[msg.sender]=uint64(block.timestamp);_mint(msg.sender,1500);emit CreditsClaimed(msg.sender,1500);
    }
    function buyPack(Purchase calldata q,bytes calldata signature) external {
        if(q.buyer!=msg.sender||q.habitat>1||q.species>12||(q.habitat==0&&q.species<3)||q.deadline<block.timestamp||packs[q.packId].owner!=address(0)||q.commitment==bytes32(0))revert InvalidQuote();
        bytes32 hash=keccak256(abi.encodePacked(hex"1901",domainSeparator(),keccak256(abi.encode(QUOTE_TYPEHASH,q.buyer,q.packId,q.habitat,q.species,q.commitment,q.deadline))));
        if(ECDSA.recover(hash,signature)!=oracle)revert InvalidQuote();
        if(pending[msg.sender].length>=available(opened[msg.sender])||pending[msg.sender].length>=3)revert LimitReached();
        uint256 price=q.habitat==0?100:500;uint256 maximum=q.habitat==0?320:1600;Pool storage pool=pools[q.habitat];
        if(pool.remaining-pool.reserved<maximum)revert ReserveLow();stamp(bought[msg.sender]);
        _transfer(msg.sender,address(this),price);pool.reserved+=maximum;
        uint64 hatch=uint64(block.timestamp)+20;packs[q.packId]=Pack(msg.sender,q.habitat,q.species,q.commitment,hatch,false);pending[msg.sender].push(q.packId);
        emit PackBought(msg.sender,q.packId,q.habitat,q.species,q.commitment,hatch);
    }
    function reveal(bytes32 id,uint256 payout,bytes32 nonce) private {
        Pack storage p=packs[id];if(p.owner!=msg.sender)revert NotOwner();if(p.opened)revert InvalidReveal();if(block.timestamp<p.maturesAt)revert NotReady();
        uint256 multiplier=p.habitat==0?1:5;
        if((payout!=40*multiplier&&payout!=100*multiplier&&payout!=200*multiplier&&payout!=320*multiplier)||keccak256(abi.encodePacked(id,payout,nonce))!=p.commitment)revert InvalidReveal();
        stamp(opened[msg.sender]);p.opened=true;Pool storage pool=pools[p.habitat];pool.reserved-=320*multiplier;pool.remaining-=payout;
        bytes32[] storage ids=pending[msg.sender];for(uint256 i;i<ids.length;i++)if(ids[i]==id){ids[i]=ids[ids.length-1];ids.pop();break;}
        _transfer(address(this),msg.sender,payout);emit PackOpened(msg.sender,id,p.habitat,payout,nonce);
    }
    function openPack(bytes32 id,uint256 payout,bytes32 nonce) external {reveal(id,payout,nonce);}
    function blackHole(uint8 habitat,uint64 expectedRound,bytes32[] calldata ids,uint256[] calldata payouts,bytes32[] calldata nonces) external {
        if(habitat>1||ids.length==0||ids.length>3||ids.length!=payouts.length||ids.length!=nonces.length)revert InvalidReveal();
        Pool storage pool=pools[habitat];if(pool.round!=expectedRound)revert InvalidQuote();
        if((lastHole[msg.sender]!=0&&block.timestamp<uint256(lastHole[msg.sender])+1 days)||(pool.collapsedAt!=0&&block.timestamp<uint256(pool.collapsedAt)+90))revert Cooldown();
        uint256 fee=habitat==0?30:120;_transfer(msg.sender,address(this),fee);
        for(uint256 i;i<ids.length;i++){if(packs[ids[i]].habitat!=habitat)revert InvalidReveal();reveal(ids[i],payouts[i],nonces[i]);}
        lastHole[msg.sender]=uint64(block.timestamp);pool.collapsedAt=uint64(block.timestamp);pool.round++;
        emit RoundCollapsed(msg.sender,habitat,pool.round,fee);
    }
}
