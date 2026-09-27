(() => {
    'use strict';

    if (window.EdenDecksAddonLoaded) return;
    window.EdenDecksAddonLoaded = true;

    let EdenAddonSelectedDeck = 0;

    function getAddonData() {
        return JSON.parse(localStorage.getItem('EdenDecksData')) || { names: {}, decks: {} };
    }

    function saveAddonData(data) {
        localStorage.setItem('EdenDecksData', JSON.stringify(data));
    }

    function getDeckName(slot) {
        const data = getAddonData();
        return data.names[slot] || `Deck ${slot}`;
    }

    function setDeckName(slot, name) {
        const data = getAddonData();
        data.names[slot] = name;
        saveAddonData(data);
    }

    function saveDeck(slot, numbers) {
        const data = getAddonData();
        data.decks[slot] = numbers;
        saveAddonData(data);
    }

    function getDeck(slot) {
        const data = getAddonData();
        return data.decks[slot] || [];
    }

    function showSelector() {
        if (document.getElementById('EdenDecksUI')) return;

        const panel = document.createElement('div');
        panel.id = 'EdenDecksUI';

        Object.assign(panel.style, {
            position: 'fixed', top: '20px', left: '20px',
            background: '#2c2c2c', border: '1px solid #666',
            borderRadius: '6px', padding: '10px', zIndex: '999999',
            color: 'white', fontFamily: 'Arial', fontSize: '14px'
        });

        const apply = document.createElement('button');
        apply.textContent = 'Apply';
        apply.style.marginBottom = '8px';
        apply.style.width = '100%';

        const select = document.createElement('select');
        select.style.width = '100%';

        for (let i = 1; i <= 40; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = getDeckName(i);
            select.appendChild(option);
        }

        const rename = document.createElement('button');
        rename.textContent = 'Rename Selected';
        rename.style.width = '100%';
        rename.style.marginBottom = '5px';
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
        window.ElementCreateDropdown('CardsTagsDropdown', Object.keys(ClubCardBuilderFilterGroupFilters), window.ClubCardBuilderTagChanged);
        window.ElementCreateDropdown('DefaultDecksDropdown', Object.keys(ClubCardBuilderDefaultDecksList), window.ClubCardBuilderLoadPrecon);
        window.ElementCreateSearchInput('CardsSearchFilter', () => window.ClubCardList.map(i => window.ClubCardTextGet(i)), { onInput: window.ClubCardBuilderInputChanged });

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
