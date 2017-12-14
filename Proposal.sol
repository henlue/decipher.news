pragma solidity ^0.4.11;

contract Proposal {
    
    string public url;      //TODO: string sizes?
    string public title;    //TODO: string sizes?
    uint public betting_end;
    uint public reveal_end;
    address public creator;

    struct Bet{
        bool exists;
        bytes32 blinded_bet;
        bool revealed_bet;
        bool has_revealed;
    }

    mapping(address => Bet) public bets;
    mapping(address => bool) public has_withdrawn;
    uint public n_bets;
    uint public n_revealed_bets;
    uint public n_upvotes;
    uint public n_correct_bets;


    modifier only_before(uint _time) { require(now < _time); _; }
    modifier only_after(uint _time) { require(now > _time); _; }

    function Proposal(string _url, string _title, uint _betting_time,
        uint _reveal_time) public
    {
        creator = msg.sender;
        url = _url;
        title = _title;
        betting_end = now + _betting_time;
        reveal_end = betting_end + _reveal_time;
    }
    
    function bet(bytes32 _blinded_bet) public
        payable 
        only_before(betting_end) 
    {
        require(msg.value == 1 ether);
        // bets are immutable
        require(bets[msg.sender].exists == false);
        
        bets[msg.sender] = Bet({exists: true,
                                blinded_bet: _blinded_bet,
                                revealed_bet: false,
                                has_revealed: false});
        n_bets++;
    }
    
    function keccak(bool _bet, bytes32 _secret) public constant returns (bytes32 hash){
        return keccak256(_bet, _secret);
    }

    
    function reveal(bool _bet, bytes32 _secret) public
        only_after(betting_end)
        only_before(reveal_end)
    {
        require(bets[msg.sender].blinded_bet == keccak256(_bet, _secret));
        require(bets[msg.sender].has_revealed == false);
        
        bets[msg.sender].has_revealed = true;
        bets[msg.sender].revealed_bet = _bet;
        
        if(_bet == true){
            n_upvotes++;
        }
        n_revealed_bets++;
    }
    
    function has_passed() public constant
        only_after(reveal_end)
        returns (bool)
    {
        return n_upvotes > n_revealed_bets/2;
    }
    
    function withdraw() public
        only_after(reveal_end)
    {
        require(bets[msg.sender].has_revealed);
        
        // calculate n_correct_bets only once
        if(n_correct_bets == 0){
            if(has_passed()){
                n_correct_bets = n_upvotes;
            } else{
                n_correct_bets = n_revealed_bets-n_upvotes;
            }
        }
        
        if(bets[msg.sender].revealed_bet == has_passed() && 
           has_withdrawn[msg.sender] == false){
            has_withdrawn[msg.sender] = true;
            msg.sender.transfer(n_bets * 1 ether/n_correct_bets);
        }
    }
    
}