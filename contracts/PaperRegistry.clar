(define-constant ERR_NOT_AUTHORIZED u100)
(define-constant ERR_ALREADY_REGISTERED u101)
(define-constant ERR_INVALID_HASH u102)
(define-constant ERR_INVALID_TITLE u103)
(define-constant ERR_INVALID_DESCRIPTION u104)
(define-constant ERR_INVALID_TIMESTAMP u105)
(define-constant ERR_INVALID_CREATION_FEE u106)
(define-constant ERR_PAPER_NOT_FOUND u107)
(define-constant ERR_MAX_PAPERS_EXCEEDED u108)
(define-constant ERR_INVALID_AUTHORITY u109)
(define-constant ERR_INVALID_CID u110)
(define-constant ERR_INVALID_STATUS u111)
(define-constant ERR_INVALID_UPDATE_PARAM u112)

(define-data-var next-paper-id uint u0)
(define-data-var max-papers uint u10000)
(define-data-var creation-fee uint u1000)
(define-data-var authority-contract (optional principal) none)

(define-map papers
  { paper-id: uint }
  { creator: principal, hash: (buff 32), title: (string-utf8 100), description: (string-utf8 500), created-at: uint, cid: (string-utf8 100), status: bool }
)

(define-map papers-by-hash
  { hash: (buff 32) }
  { paper-id: uint }
)

(define-map paper-updates
  { paper-id: uint }
  { update-title: (string-utf8 100), update-description: (string-utf8 500), update-cid: (string-utf8 100), update-timestamp: uint, updater: principal }
)

(define-read-only (get-paper (paper-id uint))
  (map-get? papers { paper-id: paper-id })
)

(define-read-only (get-paper-by-hash (hash (buff 32)))
  (match (map-get? papers-by-hash { hash: hash })
    entry (map-get? papers { paper-id: (get paper-id entry) })
    none
  )
)

(define-read-only (get-paper-updates (paper-id uint))
  (map-get? paper-updates { paper-id: paper-id })
)

(define-read-only (is-paper-registered (hash (buff 32)))
  (is-some (map-get? papers-by-hash { hash: hash }))
)

(define-read-only (get-paper-count)
  (ok (var-get next-paper-id))
)

(define-private (validate-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
    (ok true)
    (err ERR_INVALID_HASH)
  )
)

(define-private (validate-title (title (string-utf8 100)))
  (if (and (> (len title) u0) (<= (len title) u100))
    (ok true)
    (err ERR_INVALID_TITLE)
  )
)

(define-private (validate-description (description (string-utf8 500)))
  (if (<= (len description) u500)
    (ok true)
    (err ERR_INVALID_DESCRIPTION)
  )
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
    (ok true)
    (err ERR_INVALID_TIMESTAMP)
  )
)

(define-private (validate-cid (cid (string-utf8 100)))
  (if (and (> (len cid) u0) (<= (len cid) u100))
    (ok true)
    (err ERR_INVALID_CID)
  )
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
    (ok true)
    (err ERR_NOT_AUTHORIZED)
  )
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR_INVALID_AUTHORITY))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-creation-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR_INVALID_CREATION_FEE))
    (asserts! (is-some (var-get authority-contract)) (err ERR_INVALID_AUTHORITY))
    (var-set creation-fee new-fee)
    (ok true)
  )
)

(define-public (set-max-papers (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR_INVALID_UPDATE_PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR_INVALID_AUTHORITY))
    (var-set max-papers new-max)
    (ok true)
  )
)

(define-public (register-paper (hash (buff 32)) (title (string-utf8 100)) (description (string-utf8 500)) (cid (string-utf8 100)))
  (let
    (
      (paper-id (var-get next-paper-id))
      (current-max (var-get max-papers))
      (authority (var-get authority-contract))
    )
    (asserts! (< paper-id current-max) (err ERR_MAX_PAPERS_EXCEEDED))
    (try! (validate-hash hash))
    (try! (validate-title title))
    (try! (validate-description description))
    (try! (validate-cid cid))
    (asserts! (is-none (map-get? papers-by-hash { hash: hash })) (err ERR_ALREADY_REGISTERED))
    (asserts! (is-some authority) (err ERR_INVALID_AUTHORITY))
    (try! (stx-transfer? (var-get creation-fee) tx-sender (unwrap! authority (err ERR_INVALID_AUTHORITY))))
    (map-set papers
      { paper-id: paper-id }
      { creator: tx-sender, hash: hash, title: title, description: description, created-at: block-height, cid: cid, status: true }
    )
    (map-set papers-by-hash { hash: hash } { paper-id: paper-id })
    (var-set next-paper-id (+ paper-id u1))
    (print { event: "paper-registered", id: paper-id })
    (ok paper-id)
  )
)

(define-public (update-paper (paper-id uint) (new-title (string-utf8 100)) (new-description (string-utf8 500)) (new-cid (string-utf8 100)))
  (let
    (
      (paper (map-get? papers { paper-id: paper-id }))
    )
    (match paper
      p
      (begin
        (asserts! (is-eq (get creator p) tx-sender) (err ERR_NOT_AUTHORIZED))
        (try! (validate-title new-title))
        (try! (validate-description new-description))
        (try! (validate-cid new-cid))
        (map-set papers
          { paper-id: paper-id }
          {
            creator: (get creator p),
            hash: (get hash p),
            title: new-title,
            description: new-description,
            created-at: (get created-at p),
            cid: new-cid,
            status: (get status p)
          }
        )
        (map-set paper-updates
          { paper-id: paper-id }
          {
            update-title: new-title,
            update-description: new-description,
            update-cid: new-cid,
            update-timestamp: block-height,
            updater: tx-sender
          }
        )
        (print { event: "paper-updated", id: paper-id })
        (ok true)
      )
      (err ERR_PAPER_NOT_FOUND)
    )
  )
)

(define-public (deactivate-paper (paper-id uint))
  (let
    (
      (paper (map-get? papers { paper-id: paper-id }))
    )
    (match paper
      p
      (begin
        (asserts! (is-eq (get creator p) tx-sender) (err ERR_NOT_AUTHORIZED))
        (asserts! (get status p) (err ERR_INVALID_STATUS))
        (map-set papers
          { paper-id: paper-id }
          {
            creator: (get creator p),
            hash: (get hash p),
            title: (get title p),
            description: (get description p),
            created-at: (get created-at p),
            cid: (get cid p),
            status: false
          }
        )
        (print { event: "paper-deactivated", id: paper-id })
        (ok true)
      )
      (err ERR_PAPER_NOT_FOUND)
    )
  )
)