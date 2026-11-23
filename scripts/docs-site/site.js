;(function () {
  var base = document.body.getAttribute('data-base') || ''
  var page = document.body.getAttribute('data-page') || ''
  var key = 'ln-docs:' + page
  var state = {}
  try {
    state = JSON.parse(localStorage.getItem(key) || '{}') || {}
  } catch (e) {
    state = {}
  }
  function save() {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch (e) {}
  }

  /* ---- answer widgets ---- */
  var rows = [].slice.call(document.querySelectorAll('.crow'))
  function paint(row) {
    var id = row.getAttribute('data-id')
    var s = state[id] || {}
    ;[].forEach.call(row.querySelectorAll('.acts button'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === s.v))
    })
    var ta = row.querySelector('textarea')
    ta.value = s.n || ''
    ta.hidden = !(
      s.v === 'change' ||
      s.v === 'other' ||
      s.v === 'explain' ||
      s.n
    )
    row.classList.toggle('done', !!s.v)
  }
  var bar = document.getElementById('copybar')
  function count() {
    if (!bar) return
    var n = rows.filter(function (r) {
      return (state[r.getAttribute('data-id')] || {}).v
    }).length
    bar.querySelector('.count').textContent =
      n + ' of ' + rows.length + ' answered'
  }
  rows.forEach(function (row) {
    paint(row)
    var id = row.getAttribute('data-id')
    row.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('.acts button')
      if (!b) return
      var s = state[id] || {}
      s.v = s.v === b.getAttribute('data-v') ? '' : b.getAttribute('data-v')
      state[id] = s
      save()
      paint(row)
      count()
    })
    row.querySelector('textarea').addEventListener('input', function (ev) {
      var s = state[id] || {}
      s.n = ev.target.value
      state[id] = s
      save()
    })
  })
  function label(v) {
    return (
      {
        yes: 'Yes',
        explain: 'Explain again',
        change: 'Change to',
        other: 'Other',
      }[v] || v
    )
  }
  function answers() {
    var out = []
    rows.forEach(function (r) {
      var s = state[r.getAttribute('data-id')] || {}
      if (!s.v) return
      var t = r.getAttribute('data-label') + ': ' + label(s.v)
      if (s.n && s.n.trim()) t += ' (' + s.n.trim() + ')'
      out.push(t)
    })
    return out.join('; ')
  }
  if (bar) {
    bar.classList.add('on')
    count()
    var fb = document.getElementById('fallback')
    var ta = fb.querySelector('textarea')
    var showFallback = function (text) {
      ta.value = text
      fb.classList.add('on')
      ta.select()
    }
    bar.querySelector('.copy').addEventListener('click', function () {
      var text = answers() || 'No answers yet.'
      var started = false
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          started = true
          navigator.clipboard.writeText(text).then(
            function () {
              bar.querySelector('.count').textContent = 'Copied'
              fb.classList.remove('on')
            },
            function () {
              showFallback(text)
            },
          )
        }
      } catch (e) {
        started = false
      }
      if (!started) showFallback(text)
    })
    fb.querySelector('button').addEventListener('click', function () {
      fb.classList.remove('on')
    })
  }

  /* ---- search ---- */
  var input = document.getElementById('q')
  var hits = document.getElementById('hits')
  var index = null
  var loading = false
  function load(cb) {
    if (index) return cb()
    if (loading) return
    loading = true
    fetch(base + 'assets/search.json')
      .then(function (r) {
        return r.json()
      })
      .then(function (j) {
        index = j
        cb()
      })
      .catch(function () {
        index = []
        cb()
      })
  }
  function esc(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    })
  }
  function run() {
    var q = input.value.trim().toLowerCase()
    ;[].forEach.call(
      document.querySelectorAll('.card[data-text]'),
      function (c) {
        c.hidden = !!q && c.getAttribute('data-text').indexOf(q) < 0
      },
    )
    ;[].forEach.call(document.querySelectorAll('.home section'), function (s) {
      s.hidden = !!q && !s.querySelector('.card:not([hidden])')
    })
    if (!q) {
      hits.classList.remove('open')
      return
    }
    load(function () {
      var out = []
      index.forEach(function (p) {
        if ((p.title + ' ' + p.path).toLowerCase().indexOf(q) >= 0) {
          out.push(
            '<a href="' +
              base +
              p.path +
              '">' +
              esc(p.title) +
              '<small>' +
              esc(p.path) +
              '</small></a>',
          )
        }
        p.headings.forEach(function (h) {
          if (h.t.toLowerCase().indexOf(q) >= 0 && out.length < 40) {
            out.push(
              '<a href="' +
                base +
                p.path +
                '#' +
                h.id +
                '">' +
                esc(h.t) +
                '<small>' +
                esc(p.title) +
                '</small></a>',
            )
          }
        })
      })
      hits.innerHTML = out.slice(0, 40).join('') || '<a>No match</a>'
      hits.classList.add('open')
    })
  }
  if (input) {
    input.addEventListener('input', run)
    document.addEventListener('click', function (ev) {
      if (!ev.target.closest('.search')) hits.classList.remove('open')
    })
  }
})()
