/**
 * @jsx React.DOM
 */
'use strict';



var
    React = require('react'),
    AmpersandState = require('ampersand-state'),
    config = window.config,
    node = require('../js/node'),
    PlayerComponent = require('./PlayerComponent'),
    StatusComponent = require('./StatusComponent'),
    StatusIndicatorComponent = require('./StatusIndicatorComponent'),
    StatsComponent = require('./StatsComponent'),
    PlayerModel,
    playerProps,
    player0,
    player1;


// The beginnings of a model for sharing state between components
playerProps = {
    name: 'string',
    image: 'string'
};

PlayerModel = AmpersandState.extend({
    props: playerProps
});

player0 = new PlayerModel();
player1 = new PlayerModel();



var GameComponent = module.exports = React.createClass({



    getInitialState: function() {
        return {
            server: undefined,
            winner: undefined,
            score: [0, 0],
            table: undefined,
            cardReader: undefined
        };
    },



    componentDidMount: function() {

        var _this = this;
        
        node.socket.on('game.end', _this.end);
        node.socket.on('game.score', _this.score);
        node.socket.on('game.reset', _this.reset);
        
        node.socket.on('game.switchServer', function(data) {
            _this.switchServer(data.player);
        });
        
        node.socket.on('player0.join', function(data) {
            player0.set(data.player);
        });
        
        node.socket.on('player1.join', function(data) {
            player1.set(data.player);
        });

    },



    switchServer: function(player) {
        
        var
            _this = this;
        
        this.setState({
            server: player
        });

    },
    
    
    
    score: function(data) {

        var _this = this;

        this.setState({
            score: data.gameScore
        });
    },



    end: function(data) {
        
        this.setState({ winner: data.winner });
        
    },
    
    
    
    reset: function() {

        setTimeout(function() {
            for(var prop in playerProps) {
                player0.unset(prop);
                player1.unset(prop);
            }
        }, 1500);

        this.replaceState(this.getInitialState());

    },
    
    
    
    render: function() {
        return (
            <div>
                <div className='player_container'>
                    <PlayerComponent positionId='0' player={player0} server={this.state.server} winner={this.state.winner} />
                    <PlayerComponent positionId='1' player={player1} server={this.state.server} winner={this.state.winner} />
                    <StatusComponent main='true' />
                </div>
                <StatsComponent player0={player0} player1={player1} server={this.state.server} score={this.state.score} />
                <div className='status-indicators'>
                    <StatusIndicatorComponent state={this.state.table} />
                    <StatusIndicatorComponent state={this.state.cardReader} />
                </div>
            </div>
        );
    }
    

    
});
