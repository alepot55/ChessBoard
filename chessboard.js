const DEFAULT_POSITION_WHITE = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const DEFAULT_POSITION_BLACK = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1'

class ChessboardConfig {

    constructor(
        id_div,
        position = DEFAULT_POSITION_WHITE,
        color = 'w',
        onMossa = () => true,
        hints = true,
        fog = false,
        path = 'default_pieces'
    ) {
        this.id_div = id_div;
        this.position = position;
        this.color = color;
        this.onMossa = onMossa;
        this.hint = hints;
        this.fog = fog;
        this.path = path;
    }


    setIdDiv(id_div) {
        this.config.id_div = id_div;
        return this;
    }

    setPosition(position) {
        this.position = position;
        return this;
    }

    setColor(color) {
        this.color = color;
        return this;
    }

    setOnMossa(onMossa) {
        this.config.onMossa = onMossa;
        return this;
    }

    setHints(hints) {
        this.hints = hints;
        return this;
    }

    setFog(fog) {
        this.fog = fog;
        return this;
    }

    setPath(path) {
        this.config.path = path;
        return this;
    }

    setTheme(theme) {
        for (let key in theme) {
            this.theme[key] = theme[key];
        }
        return this;
    }

    build() {
        return new Chessboard(this);
    }

}

class Chessboard {

    constructor(config) {

        this.config = config;

        this.game = Chess(config.position);

        this.terminata = false;
        this.promoting = false;

        // Crea la tavola e la Chessboard
        this.buildBoard();
        this.updatePosition();
    }

    // Build

    buildBoard() {

        this.board = document.getElementById(this.config.id_div);
        this.board.className = "board";

        this.buildSquares();
    }

    buildSquares() {

        this.squares = {};
        this.casellaCliccata = null;
        this.celle = {};
        this.pezzi = {};
        this.pieces = {};
        this.mosseIndietro = [];


        for (let row = 0; row < 8; row++) {

            this.squares[row] = {};

            for (let col = 0; col < 8; col++) {

                // Imposta l'id della cella e crea un nuovo elemento div
                let id = this.getSquareID(row, col)
                let square = document.createElement("div");

                this.celle[id] = square;
                this.squares[row][col] = square;
                square.id = id;
                this.resetSquare(id);

                this.board.appendChild(square);
            }
        }

        this.addListeners();
    }

    // Pieces

    containsPiece(square) {
        return this.game.get(square) !== null;
    }

    translatePiece(piece, from, to) {
    }

    removePiece(square) {

        if (!this.containsPiece(square)) return null;

        this.celle[square].removeChild(this.pezzi[square]['img']);
        let piece = this.pezzi[square]['piece'];

        this.pezzi[square] = null;
        this.pieces[(piece, square)] = null;

        return piece;
    }

    putPiece(square, piece) {
        let img = document.createElement("img");
        img.className = "piece";

        let percorso = this.config.path + '/' + piece + '.svg';
        img.src = percorso;

        if (piece[1] === this.config.color) {
            let board = this;
            img.addEventListener('dragstart', () => {
                board.onClick(square);
            });
        }

        this.pezzi[square] = { 'img': img, 'piece': piece };
        this.pieces[(piece, square)] = { 'img': img };
        this.celle[square].appendChild(img);
    }

    updatePieces() {

        let partita = this.config.fog && !this.terminata ? this.gameVisualizzata : this.game;

        for (let square in this.celle) {

            let pieceNew = partita.get(square) ? partita.get(square)['type'] + partita.get(square)['color'] : null;

            let pieceOld = this.pezzi[square] ? this.pezzi[square]['piece'] : null;

            if (pieceNew === null && pieceOld !== null) {

                this.removePiece(square);

            }

            else if (pieceNew !== null && pieceOld === null) {

                this.putPiece(square, pieceNew);

            }

            else if (pieceNew !== null && pieceOld !== null) {

                if (pieceNew !== pieceOld) {
                    this.removePiece(square);
                    this.putPiece(square, pieceNew);
                }
            }

        }
    }

    removePieces() {
        for (let casella in this.celle) {
            this.removePiece(casella);
        }
    }

    opponentPiece(square) {
        return this.game.get(square) !== null && this.game.get(square)['color'] !== this.config.color;
    }

    playerPiece(square) {
        return this.game.get(square) !== null && this.game.get(square)['color'] === this.config.color;
    }

    // Listeners

    addListeners() {
        if (this.mosseIndietro.length > 0) return;
        for (let casella in this.celle) {
            let cella = this.celle[casella];
            cella.addEventListener("mouseover", () => this.hintMoves(casella));
            cella.addEventListener("mouseout", () => this.dehintMoves(casella));
            cella.addEventListener("click", () => this.onClick(casella));
            cella.addEventListener('dragover', function (event) {
                event.preventDefault(); // Permette il drop
            });

            let board = this;
            cella.addEventListener('drop', function (event) {
                event.preventDefault(); // Previene l'apertura del link
                board.onClick(casella);
            });
        }
    }

    onClick(casella) {

        if (!this.playerTurn() || this.terminata) return;

        console.log(this.casellaCliccata, casella);

        let from = this.casellaCliccata;
        this.casellaCliccata = null;

        if (this.promoting) {
            this.depromoteAllSquares();
            this.removeAllCovers();
            this.promoting = false;
        }

        if (from) {
            this.deselectSquare(from);
            this.dehintMoves(from);
        }

        // Se ci sono caselle selezionate e non possiedo la casella cliccata
        if (from !== null && !this.playerPiece(casella)) {

            let mossa = from + casella;

            if (!this.legalMove(mossa)) return;
            if (this.promozione(mossa)) return;

            // Esegui la mossa se accettata dalla funzione onMossa
            if (this.config.onMossa(mossa)) this.move(mossa);

        } else if (this.playerPiece(casella)) {

            this.selectSquare(casella);
            this.hintMoves(casella);
            this.casellaCliccata = casella;

        } 
    }

    // Hint

    hintSquare(square) {

        // Se i suggerimenti sono attivi e la square è vuota
        if (this.config.hint && this.casellaCliccata === null) {

            // Crea un nuovo elemento div per il cerchio
            square = this.celle[square];
            let hint = document.createElement("div");

            // Imposta lo stile del hint
            hint.className = "hint";
            if (this.opponentPiece(square.id)) hint.className += " catchable";

            // Aggiunge il hint alla square
            square.appendChild(hint);
        }
    }

    hintMoves(square) {
        let mosse = this.game.moves({ square: square, verbose: true });
        for (let mossa of mosse) {
            this.hintSquare(mossa['to']);
        }
    }

    dehintMoves(square) {
        let mosse = this.game.moves({ square: square, verbose: true });
        for (let mossa of mosse) {
            this.dehintSquare(mossa['to']);
        }
    }

    dehintSquare(square) {
        if (this.config.hint && this.casellaCliccata === null) {
            let cella = this.celle[square];
            let figli = cella.childNodes;

            for (let i = figli.length - 1; i >= 0; i--) {
                if (figli[i].className.includes('hint')) {
                    cella.removeChild(figli[i]);
                }
            }
        }
    }

    dehintAllSquares() {
        for (let casella in this.celle) {
            this.dehintSquare(casella);
        }
    }

    // Fog

    fogSquare(square) {
        let elem = this.celle[square];
        if (this.isWhiteSquare(square)) elem.className += ' whiteSquareFog';
        else elem.className += ' blackSquareFog';
    }

    defogSquare(square) {
        let elem = this.celle[square];
        if (this.isWhiteSquare(square)) elem.className.replace(' whiteSquareFog', '');
        else elem.className = elem.className.replace(' blackSquareFog', '');
    }

    defogAllSquares() {
        for (let casella in this.celle) {
            this.defogSquare(casella);
        }
    }

    fogHiddenSquares() {

        // Se c'è solo un re, non annebbiare le caselle perché la partita è terminata
        let k = 0;
        for (let casella in this.celle) {
            if (this.game.get(casella) === null) continue;
            else if ('k' === this.game.get(casella)['type']) k = k + 1;
        }
        if (k === 1) {
            this.termina();
            return;
        }

        // Imposta la position della partita visualizzata
        let position = this.game.fen();

        // Rimuove lo scacco
        position = position.replace('+', '');

        // Cambia il turno
        if (position.split(' ')[1] !== this.config.color) {
            let parti = position.split(' ');
            parti[1] = this.config.color;
            parti[3] = '-';
            position = parti.join(' ');
        }

        // Imposta la position della partita visualizzata
        this.gameVisualizzata = Chess(position);

        // Rimuove i pezzi dalle caselle non accessibili e salva le caselle occupate
        let caselleAccessibili = this.mossePossibili().map(m => m['to']);
        let caselleOccupate = []
        for (let casella in this.celle) {
            if (!caselleAccessibili.includes(casella) && !this.playerPiece(casella) && this.game.get(casella) !== null) {
                this.gameVisualizzata.remove(casella);
                caselleOccupate.push(casella);
            }
        }

        // Colora le caselle accessibili e non accessibili e salva le caselle annebbiate
        caselleAccessibili = this.mossePossibili().map(m => m['to']);
        this.celleAnnebbiate = [];
        for (let casella in this.celle) {
            if ((!caselleAccessibili.includes(casella) && !this.playerPiece(casella)) || caselleOccupate.includes(casella)) {
                this.fogSquare(casella);
                this.celleAnnebbiate.push(casella);
            } else {
                this.defogSquare(casella);
            }
        }
    }

    // Select

    selectSquare(square) {
        let elem = this.celle[square];
        elem.className += ' selectedSquare';
    }

    deselectSquare(square) {
        let elem = this.celle[square];
        elem.className = elem.className.replace(' selectedSquare', '');
    }

    deselectAllSquares() {
        for (let casella in this.celle) {
            this.deselectSquare(casella);
        }
    }

    // Moves

    movedSquare(square) {
        let elem = this.celle[square];
        elem.className += ' movedSquare';
    }

    unmovedSquare(square) {
        let elem = this.celle[square];
        elem.className = elem.className.replace(' movedSquare', '');
    }

    legalMove(mossa) { // Restituisce true se la mossa è legale
        let partita = this.config.fog ? this.gameVisualizzata : this.game;
        let mosseLegali = partita.moves({ square: mossa.slice(0, 2), verbose: true }).map(m => m['from'] + m['to']);
        if (this.config.fog) return !this.celleAnnebbiate.includes(mossa.slice(2, 4)) && mosseLegali.includes(mossa);
        return mosseLegali.includes(mossa);
    }

    getLegalMoves(casella = null) { // Restituisce le mosse possibili

        // Se la modalità nebbia è attiva, restituisci le mosse possibili dalla partita visualizzata
        let partita = this.config.fog ? this.gameVisualizzata : this.game;

        // Restituisci le mosse possibili per la casella specificata o per la partita
        if (casella === null) {
            return partita.moves({ verbose: true });
        } else {
            return partita.moves({ square: casella, verbose: true });
        }
    }

    move(mossa) {

        if (this.rit) this.lastPosition();

        this.deselectAllSquares();

        // Esegue la mossa 
        let res = this.game.move({ from: mossa.slice(0, 2), to: mossa.slice(2, 4), promotion: mossa.length === 5 && "rbqn".includes(mossa[4]) ? mossa[4] : undefined });

        // Se la mossa non è stata eseguita in nebbia
        if (res == null && this.config.fog) {

            // Rimuove i pezzi del giocatore avversario 
            let pezziRimossi = {};
            for (let casella in this.celle) {
                if (this.game.get(casella) !== null && this.game.get(casella)['color'] !== this.game.turn() && this.game.get(casella)['type'] !== 'k') {
                    pezziRimossi[casella] = this.game.remove(casella);
                }
            }

            // Esegue la mossa nella partita visualizzata e nella partita
            this.game.move({ from: mossa.slice(0, 2), to: mossa.slice(2, 4), promotion: mossa.length === 5 ? mossa[4] : undefined });
            this.gameVisualizzata.move({ from: mossa.slice(0, 2), to: mossa.slice(2, 4), promotion: mossa.length === 5 ? mossa[4] : undefined });

            // Ripristina i pezzi rimossi
            for (let casella in pezziRimossi) {
                this.game.put(pezziRimossi[casella], casella);
            }

            // updatePosition la position della partita
            let nuovaFen = this.game.fen().split(' ')[0];
            nuovaFen = [nuovaFen].concat(this.gameVisualizzata.fen().split(' ').slice(1));
            nuovaFen = nuovaFen.join(' ');
            this.game = Chess(nuovaFen);
        }

        // updatePosition la Chessboard
        this.updatePosition();

        // Se la partita non è terminata, evidenzia la mossa
        if (!this.config.fog || this.terminata) {
            this.movedSquare(mossa.slice(2, 4));
            this.movedSquare(mossa.slice(0, 2));
        }
    }

    // State

    statoPartita() { // Restituisce lo stato della partita

        // Se la modalità nebbia è attiva
        if (this.config.fog) {
            if (this.game.fen() === '') return null;

            // Se c'è solo un re, restituisci il vincitore
            let kb = false;
            let kw = false;
            for (let casella in this.celle) {
                if (this.game.get(casella) === null) continue;
                else if ('kb' === this.game.get(casella)['type'] + this.game.get(casella)['color']) kb = true;
                else if ('kw' === this.game.get(casella)['type'] + this.game.get(casella)['color']) kw = true;
            }
            if (!kb) return 'w';
            if (!kw) return 'b';
        } else if (this.game.game_over()) {

            // Se la partita è terminata, restituisci il vincitore
            if (this.game.in_checkmate()) return this.game.turn() === 'w' ? 'b' : 'w';
            return 'p';
        }
        return null;
    }

    termina() { // Termina la partita
        this.terminata = true;
    }

    // Position

    chageFenTurn(fen, color) {
        let parts = fen.split(' ');
        parts[1] = color;
        return parts.join(' ');

    }

    setPosition(position, color = null) {
        if (color === null) color = position.split(' ')[1];
        let change_color = this.config.color !== color;
        this.config.setColor(color);
        this.game = Chess(position);
        this.updatePosition(change_color);
    }

    ribalta() {
        let position = this.game.fen();
        this.setPosition(position, this.config.color === 'w' ? 'b' : 'w');
    }

    playerTurn() { // Restituisce true se è il turno del giocatore
        return this.config.color === this.game.turn();
    }

    isWhiteSquare(square) {
        let letters = 'abcdefgh';
        return (letters.indexOf(square[0]) + parseInt(square[1])) % 2 === 0;
    }

    isWhiteOriented() {
        return this.config.color === 'w';
    }

    updatePosition(change_color = false) {
        this.terminata = false;
        if (change_color) {
            this.removeSquares();
            this.buildSquares();
        }
        this.updatePieces();
        if (this.config.fog) this.fogHiddenSquares();
        if (this.statoPartita() !== null) this.termina();
    }

    // Game replay

    backward() {
        let mossa = this.game.undo();
        if (mossa !== null) {
            this.mosseIndietro.push(mossa);
            this.updatePosition();
            if (this.game.undo()) this.avanti();
        } else {
            this.updatePosition();
        }
        return mossa;
    }

    forward() {
        if (this.mosseIndietro.length === 0) return;
        let mossa = this.mosseIndietro.pop();
        mossa = mossa['from'] + mossa['to'] + (mossa['promotion'] ? mossa['promotion'] : '');
        this.move(mossa, false);
    }

    lastPosition() {
        while (this.mosseIndietro.length > 0) {
            this.avanti();
        }
    }

    firstPosition() {
        let mossa = this.game.undo();
        while (mossa !== null) {
            this.mosseIndietro.push(mossa);
            mossa = this.game.undo();
        }
        this.updatePosition();
    }

    // Other

    getSquareCoord(coord) {
        let letters = 'abcdefgh';
        if (this.isWhiteOriented()) {
            return [8 - parseInt(coord[1]), letters.indexOf(coord[0])];
        }
        return [parseInt(coord[1]) - 1, 7 - letters.indexOf(coord[0])];
    }

    resetSquare(square) {
        let elem = this.celle[square];
        elem.className = 'square ' + (this.isWhiteSquare(square) ? 'whiteSquare' : 'blackSquare');
    }

    // Promotion

    coverSquare(square) {
        let cover = document.createElement("div");
        cover.className = "square cover";
        this.celle[square].appendChild(cover);
    }

    removeCover(square) {
        let elem = this.celle[square];
        let figli = elem.childNodes;
        
        for (let i = figli.length - 1; i >= 0; i--) {
            if (figli[i].className.includes('cover')) {
                elem.removeChild(figli[i]);
            }
        }
    }

    removeAllCovers() {
        for (let casella in this.celle) {
            this.removeCover(casella);
        }
    }

    promoteSquare(square, piece) {
        let choice = document.createElement("div");
        choice.className = "square choice";

        let img = document.createElement("img");
        img.className = "piece";
        img.src = this.config.path + '/' + piece + '.svg';
        choice.appendChild(img);

        choice.addEventListener('click', () => {
            this.move(this.casellaCliccata + square + piece);
        });
        this.celle[square].appendChild(choice);
    }

    depromoteSquare(square) {
        let elem = this.celle[square];
        let figli = elem.childNodes;

        for (let i = figli.length - 1; i >= 0; i--) {
            if (figli[i].className.includes('choice')) {
                elem.removeChild(figli[i]);
            }
        }
    }

    depromoteAllSquares() {
        for (let casella in this.celle) {
            this.depromoteSquare(casella);
        }
    }

    promozione(mossa) {   
        let to = mossa.slice(2, 4);
        let from = mossa.slice(0, 2);
        let pezzo = this.game.get(from);
        let [row, col] = this.getSquareCoord(to);
        let choices = ['q', 'r', 'b', 'n']

        if (pezzo['type'] !== 'p' || !(row === 0 || row === 7)) return false;

        for (let casella in this.celle) {
            let [rowCurr, colCurr] = this.getSquareCoord(casella);

            if (col === colCurr && Math.abs(row - rowCurr) <= 3) {
                this.promoteSquare(casella,  choices[Math.abs(row - rowCurr)] + this.config.color);
            } else {
                this.coverSquare(casella);
            }
        }

        this.casellaCliccata = from;
        this.promoting = true;

        return true;
    }


    getSquareID(row, col) {
        row = parseInt(row);
        col = parseInt(col);
        if (this.isWhiteOriented()) {
            row = 8 - row;
            col = col + 1;
        } else {
            row = row + 1;
            col = 8 - col;
        }
        let letters = 'abcdefgh';
        let letter = letters[col - 1];
        return letter + row;
    }

    removeSquares() { // Rimuove le caselle dalla Chessboard
        for (let casella in this.celle) {
            this.board.removeChild(this.celle[casella]);
        }
        this.celle = {};
    }

}