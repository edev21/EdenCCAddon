(() => {
    'use strict';
    if (window.EdenDecksAddonLoaded) return;
    window.EdenDecksAddonLoaded = true;
    
    let EdenAddonSelectedDeck = 0;
    let EdenData = getAddonData();

    function getAddonData() {
        return JSON.parse(localStorage.getItem('EdenDecksData')) || { names: {}, decks: {} };
    }

    function saveAddonData(data) {
        localStorage.setItem('EdenDecksData', JSON.stringify(data));
    }

    function getDeckName(slot) {
        return EdenData.names[slot] || `Deck ${slot}`;
    }

    function setDeckName(slot, name) {
        EdenData.names[slot] = name;
        saveAddonData(EdenData);
    }

    function saveDeck(slot, numbers) {
        EdenData.decks[slot] = numbers;
        saveAddonData(EdenData);
    }

    function getDeck(slot) {
        return EdenData.decks[slot] || [];
    }

    function addAddonStyles() {
        if (document.getElementById('EdenDecksStyles')) return;

        const style = document.createElement('style');
        style.id = 'EdenDecksStyles';
        style.textContent = `
            #EdenDecksUI {
                position: fixed;
                top: 20px;
                left: 20px;
                z-index: 999999;
                box-sizing: border-box;
                padding: 10px;
                border: 1px solid #666;
                border-radius: 6px;
                background: #2c2c2c;
                color: white;
                font-family: Arial, sans-serif;
                font-size: 14px;
            }

            #EdenDecksUI button,
            #EdenDecksUI select {
                box-sizing: border-box;
                width: 100%;
            }

            #EdenDecksUI button {
                margin-bottom: 5px;
            }

            #EdenDecksUI .eden-decks-apply {
                margin-bottom: 8px;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    function showSelector() {
        if (document.getElementById('EdenDecksUI')) return;

        addAddonStyles();

        const panel = document.createElement('div');
        panel.id = 'EdenDecksUI';

        const apply = document.createElement('button');
        apply.className = 'eden-decks-apply';
        apply.textContent = 'Apply';

        const select = document.createElement('select');

        for (let i = 1; i <= 40; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = getDeckName(i);
            select.appendChild(option);
        }

        const rename = document.createElement('button');
        rename.textContent = 'Rename Selected';
        rename.onclick = () => {
            const slot = Number(select.value);
            const newName = prompt('New name:', getDeckName(slot));
            if (newName === null) return;
            setDeckName(slot, newName);
            select.options[select.selectedIndex].textContent = newName;
        };

        apply.onclick = () => {
            const slot = Number(select.value);
            const deck = getDeck(slot);
            EdenAddonSelectedDeck = slot;

            if (window.CurrentScreen === 'ClubCard') EdenLoadDeckNumber(deck);
            if (window.CurrentScreen === 'ClubCardBuilder') EdenBuilderLoadDeck(deck);
            panel.remove();
        };

        panel.appendChild(rename);
        panel.appendChild(apply);
        panel.appendChild(select);
        document.body.appendChild(panel);
    }

    function hookClubCardLoad() {
        const original = window.ClubCardLoad;
        window.ClubCardLoad = function (...args) {
            showSelector();
            return original.apply(this, args);
        };
    }

    function hookClubCardBuilderLoad() {
        const original = window.ClubCardBuilderLoad;
        window.ClubCardBuilderLoad = function (...args) {
            showSelector();
            return original.apply(this, args);
        };
    }

    function hookClubCardBuilderFinishEdit() {
        const original = window.ClubCardBuilderFinishEdit;
        window.ClubCardBuilderFinishEdit = function (...args) {
            showSelector();
            return original.apply(this, args);
        };
    }

    function hookClubCardBuilderSaveChanges() {
        const original = window.ClubCardBuilderSaveChanges;
        window.ClubCardBuilderSaveChanges = function (...args) {
            if (EdenAddonSelectedDeck > 0) return EdenSaveFunction(...args);
            return original.apply(this, args);
        };
    }

    function hookClubCardBuilderGetDeckName() {
        const original = window.ClubCardBuilderGetDeckName;
        window.ClubCardBuilderGetDeckName = function (...args) {
            if (EdenAddonSelectedDeck > 0) return getDeckName(EdenAddonSelectedDeck);
            return original.apply(this, args);
        };
    }

    function hookClubCardLoadDeckNumber() {
        const original = window.ClubCardLoadDeckNumber;
        window.ClubCardLoadDeckNumber = function (...args) {
            document.getElementById('EdenDecksUI')?.remove();
            return original.apply(this, args);
        };
    }

    function hookClubCardBuilderUnload() {
        const original = window.ClubCardBuilderUnload;
        window.ClubCardBuilderUnload = function (...args) {
            const result = original.apply(this, args);
            document.getElementById('EdenDecksUI')?.remove();
            EdenAddonSelectedDeck = 0;
            return result;
        };
    }

    function hookClubCardBuilderLoadDeck() {
        const original = window.ClubCardBuilderLoadDeck;
        window.ClubCardBuilderLoadDeck = function (...args) {
            EdenAddonSelectedDeck = 0;
            document.getElementById('EdenDecksUI')?.remove();
            return original.apply(this, args);
        };
    }

    function EdenBuilderLoadDeck(deck) {
        window.ElementCreateDropdown('CardsTagsDropdown', Object.keys(ClubCardBuilderFilterGroupFilters), function () {
            ClubCardBuilderSelectedTag = this.value;
            window.ClubCardBuilderFilterLoad();
        });
        window.ElementCreateDropdown('DefaultDecksDropdown', Object.keys(ClubCardBuilderDefaultDecksList), function () {
            ClubCardBuilderDeckCurrent = ClubCardBuilderDefaultDecksList[this.value]?.slice();
        });
        window.ElementCreateSearchInput('CardsSearchFilter', () => window.ClubCardList.map(i => window.ClubCardTextGet(i.Name)), { onInput: window.ClubCardBuilderInputChanged });

        window.ClubCardBuilderDeckIndex = deck;

        if (deck.length < window.ClubCardBuilderMinDeckSize || deck.length > window.ClubCardBuilderMaxDeckSize) {
            window.ClubCardBuilderDeckCurrent = window.ClubCardBuilderDefaultDeck.slice();
            window.ClubCardBuilderFilterLoad();
            return;
        }

        window.ClubCardBuilderDeckCurrent = deck;
        window.ClubCardBuilderFilterLoad();
    }

    function EdenSaveFunction() {
        saveDeck(EdenAddonSelectedDeck, window.ClubCardBuilderDeckCurrent);
        EdenAddonSelectedDeck = 0;
        window.ClubCardBuilderDeckIndex = -1;
        showSelector();
    }

    function EdenLoadDeckNumber(selectedDeck) {
        window.ElementRemove('DefaultDecksDropdown');
        let deck = [];
        const isValid = selectedDeck.length >= window.ClubCardBuilderMinDeckSize && selectedDeck.length <= window.ClubCardBuilderMaxDeckSize;

        if (isValid) {
            const msg = window.TextGet('UsingDeck').replace('PLAYERNAME', window.CharacterNickname(window.Player));
            window.ClubCardMessageAdd(ClubCardMessageType.SYSTEM, null, {}, null, msg);
            deck = selectedDeck;
        } else {
            const msg = window.TextGet('NoValidDeckFound').replace('PLAYERNAME', window.CharacterNickname(window.Player));
            window.ClubCardMessageAdd(ClubCardMessageType.SYSTEM, null, {}, null, msg);
            deck = window.ClubCardBuilderDefaultDeck.slice();
        }

        window.ClubCardDefaultSelection = 'Default';
        const index = window.ClubCardGetPlayerIndex();

        if (index >= 0) {
            window.ClubCardPlayer[index].Deck = window.ClubCardShuffle(window.ClubCardLoadDeck(deck));
            window.ClubCardPlayer[index].FullDeck = window.ClubCardLoadDeck(deck);
            for (const card of window.ClubCardPlayer[index].FullDeck) {
                if (card.OnGameStart) card.OnGameStart(window.ClubCardPlayer[index]);
            }
        }

        if (!window.ClubCardIsOnline()) {
            const textGetKey = 'Start' + (window.ClubCardTurnIndex === 0 ? 'Player' : 'Opponent');
            window.ClubCardMessageAdd(ClubCardMessageType.SYSTEM, textGetKey);
            window.ClubCardPlayer[0].Hand.push(window.ClubCardGetCopyCardByName('Tips'));
            window.ClubCardPlayer[1].Hand.push(window.ClubCardGetCopyCardByName('Tips'));
            window.ClubCardPlayerDrawCard(window.ClubCardPlayer[0], window.ClubCardTurnIndex === 0 ? 5 : 6);
            window.ClubCardPlayerDrawCard(window.ClubCardPlayer[1], window.ClubCardTurnIndex === 1 ? 5 : 6);
        } else {
            window.ClubCardPlayer[index].Hand.push(window.ClubCardGetCopyCardByName('Tips'));
            window.ClubCardPlayerDrawCard(window.ClubCardPlayer[index], window.ClubCardTurnIndex === index ? 5 : 6);
        }

        window.GameClubCardSyncOnlineData('Action', true);
        window.ClubCardReward = null;

        if (!window.ClubCardIsOnline() && window.ClubCardPlayer[1].Character.IsNpc()) {
            for (const card of window.ClubCardList) {
                if (card.Reward === 'NPC-' + window.ClubCardPlayer[1].Character.Name || card.Reward === window.ClubCardPlayer[1].Character.AccountName) {
                    const char = String.fromCharCode(card.ID);
                    if (window.Player.Game == null || window.Player.Game.ClubCard == null || window.Player.Game.ClubCard.Reward == null || window.Player.Game.ClubCard.Reward.indexOf(char) < 0) {
                        window.ClubCardReward = card;
                        break;
                    }
                }
            }
        }

        if (window.ClubCardIsOnline() && window.ClubCardIsPlaying()) {
            for (const card of window.ClubCardList) {
                if (card.Reward && (card.RewardMemberNumber === window.ClubCardOnlinePlayerMemberNumber1 || card.RewardMemberNumber === window.ClubCardOnlinePlayerMemberNumber2)) {
                    const char = String.fromCharCode(card.ID);
                    if (window.Player.Game == null || window.Player.Game.ClubCard == null || window.Player.Game.ClubCard.Reward == null || window.Player.Game.ClubCard.Reward.indexOf(char) < 0) {
                        window.ClubCardReward = card;
                        break;
                    }
                }
            }
        }

        if (window.ClubCardReward != null) {
            if (window.ClubCardReward.Type == null) window.ClubCardReward.Type = 'Member';
            window.ClubCardFocus = { ...window.ClubCardReward, Location: 'Reward', AnimationState: 'idle' };
            if (window.ClubCardPlayer[1].Control === 'AI') window.ClubCardPlayer[1].Hand.push({ ...window.ClubCardReward });
            window.ClubCardCreatePopup('TEXT', window.TextGet('CanWinNewCard') + ' ' + window.ClubCardReward.Title, window.TextGet('Play'), null, 'ClubCardAIStart()', null);
            window.ClubCardOptionSelection = true;
        } else {
            window.ClubCardAIStart();
        }
    }

    const interval = setInterval(() => {
        if (!window.ClubCardLoad) return;
        clearInterval(interval);
        hookClubCardLoad();
        hookClubCardBuilderLoad();
        hookClubCardBuilderSaveChanges();
        hookClubCardBuilderFinishEdit();
        hookClubCardBuilderGetDeckName();
        hookClubCardBuilderLoadDeck();
        hookClubCardBuilderUnload();
        hookClubCardLoadDeckNumber();
        console.log("Eden's Decks Addon loaded.");
    }, 100);
})();
