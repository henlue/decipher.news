web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
//code = fs.readFileSync('Proposal.sol').toString()
set_account()

var proposals = []
var bets = {}
var abi
var contract
var byte_code

function read_code(){
  var file = document.getElementById("file").files[0]
  var reader = new FileReader()
  reader.readAsText(file)
  reader.onload = (function(evt){
    compiled_code = JSON.parse(evt.target.result)
    abi = JSON.parse(compiled_code.contracts[':Proposal'].interface)
    contract = web3.eth.contract(abi)
    byte_code = compiled_code.contracts[':Proposal'].bytecode
  })
  //solc = require('solc')
  //compiled_code = solc.compile(code)
}

function set_account(){
  var account_id = document.getElementById("account").selectedIndex
  web3.eth.defaultAccount = web3.eth.accounts[account_id]
  update_balance()
}

function update_balance(){
  balance = web3.eth.getBalance(web3.eth.defaultAccount)
  p = document.getElementById('balance')
  p.innerHTML = web3.fromWei(balance,'ether').toFixed(4)
}

function new_proposal() {
  title = $("#title").val()
  url = $("#url").val()
  betting_time = $("#betting_time").val()
  reveal_time = $("#reveal_time").val()

  deployed_contract = contract.new(url, title, 
    betting_time, 
    reveal_time,
    {data: byte_code, gas: 4700000}, 
    function(err, contr) {
      // ignore weirdly called first callback
      if (typeof contr.address !== 'undefined') {
        proposal = contract.at(deployed_contract.address)
        proposal.info = {}
        proposals.push(proposal)
        update_proposals()
      }
    })
}

function update_proposals(){
  var old_tbody = document.getElementById('proposals').getElementsByTagName('tbody')[0]
  var new_tbody = document.createElement('tbody')
  for (var i = 0; i < proposals.length; i++) {
    title = proposals[i].title.call()
    url = proposals[i].url.call()
    n_revealed_bets = proposals[i].n_revealed_bets.call().toNumber()
    if (n_revealed_bets < 1){
      result = '-'
    } else {
      n_upvotes = proposals[i].n_upvotes.call().toNumber()
      result = n_upvotes/n_revealed_bets
      result = result.toFixed(2)
    }
    
    var new_row = new_tbody.insertRow()
    
    fill_row(new_row,i,title,url,result)
  }
  old_tbody.parentNode.replaceChild(new_tbody, old_tbody)
  proposals_table = new_tbody
}

function fill_row(row, i, titel, url, result){

  var a = document.createElement('a')
  a.appendChild(document.createTextNode(title))
  a.href = url
  row.insertCell(0).appendChild(a)

  row.insertCell(1).appendChild(
    document.createTextNode(''))

  row.insertCell(2).appendChild(
    document.createTextNode(''))

  var yay = document.createElement('a')
  yay.appendChild(document.createTextNode('yay'))
  yay.onclick = function(){return bet(i, true)}
  row.insertCell(3).appendChild(yay)
  row.cells[3].appendChild(
    document.createTextNode(' '))
  var nay = document.createElement('a')
  nay.appendChild(document.createTextNode('nay'))
  nay.onclick = function(){return bet(i, false)}
  row.cells[3].appendChild(nay)

  var reveal = document.createElement('a')
  reveal.appendChild(document.createTextNode('reveal'))
  reveal.onclick = function(){return reveal_bet(i)}
  row.insertCell(4).appendChild(reveal)

  row.insertCell(5).appendChild(
    document.createTextNode(result))

  var withdraw = document.createElement('a')
  withdraw.appendChild(document.createTextNode('withdraw'))
  withdraw.onclick = function(){return withdraw_eth(i)}
  row.insertCell(6).appendChild(withdraw)
}

function bet(i, yay){
  secret = web3.sha3(Math.random().toString())
  hash = proposals[i].keccak.call(yay,secret)
  proposals[i].bet.call(hash,{value:web3.toWei(1, 'ether'), gas: 4700000})
  proposals[i].bet.sendTransaction(hash,{value:web3.toWei(1, 'ether'), gas: 4700000})

  proposals[i].info[web3.eth.defaultAccount] = {bet:yay,secret:secret}

  update_balance()
}

function reveal_bet(i){
  b = proposals[i].info[web3.eth.defaultAccount].bet
  s = proposals[i].info[web3.eth.defaultAccount].secret
  proposals[i].reveal.sendTransaction(b,s,{gas: 4700000})
}
function withdraw_eth(i){
  proposals[i].withdraw.sendTransaction()
  update_balance()
}

intervalId = setInterval(function(){
  for (var i = 0; i < proposals.length; i++) {
    betting_end = proposals[i].betting_end.call().toNumber()
    reveal_end = proposals[i].reveal_end.call().toNumber()
    betting_time = Math.round(betting_end
      -Date.now()/1000)
    if(betting_time<0){betting_time=0}
    if(betting_time>0){
      reveal_time = Math.round(
        reveal_end-betting_end)
    }else{
      reveal_time = Math.round(reveal_end
      -Date.now()/1000)
      if(reveal_time<0){reveal_time=0}
    }

    tbody = document.getElementById("proposals").getElementsByTagName('tbody')[0]
    row = tbody.rows[i]
    row.cells[1].replaceChild(
      document.createTextNode(betting_time),
      row.cells[1].childNodes[0])
    row.cells[2].replaceChild(
      document.createTextNode(reveal_time),
      row.cells[2].childNodes[0])
  }
},1000)