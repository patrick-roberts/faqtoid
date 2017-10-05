// jshint multistr:true
/*
FAQtoid
Version 1.6.2
Copyright Patrick Roberts 2016
*/

(function($) {
    var script = $('#faqtoidScript');
    var answerSetSize = 5,
        answers = [];
    var uncaughtErrors = [];

    function escapeHtml(s) {
        return $('<div/>').text(s).html();
    }

    function emoji(u, s) {
        return String.fromCodePoint ? String.fromCodePoint(u) : s;
    }

    function ellipsis(s, n) {
        return s.length > n ? s.substr(0, n - 1) + '\u2026' : s;
    }

    function sum(a) {
        var i, s = 0;
        for (i = a.length - 1; i >= 0; i--) {
            s += a[i];
        }
        return s;
    }

    function average(a) {
        return sum(a) / (a.length || 1);
    }

    function formatQuestion(x) {
        return '<li><a title="Click to show answer" href="#answer' + x.i + '" class=faqtoidQuestion answer=' + x.i + '>' + x.q + '</a><div class=faqtoidAnswer answer=' + x.i + '><p>' + x.a + '</div></li>';
    }

    /*function faqtoidClick() {
        var i = $(this).attr('answer')
        $('.faqtoidAnswer[answer!=' + i + ']').slideUp(200, function() { $('.faqtoidAnswer[answer=' + i + ']').slideDown() })
        return false
    }*/

    function wipeHTML(html) {
        // strip html but preserve word positions
        // - no double this still has a lot of flaws
        // have to remove comments first cuz they could contain other html tags
        //function whiteout(s) { return Array(s.length + 1).join(' ') }
        return html.replace(/<!--.*?-->|<[^>]+>/g, function(s) {
            return Array(s.length + 1).join(' ');
        });
    }

    function highlightHTML(s, highlights, className) {
        // s is html and highlights is an array of {start:int, end:int}
        var lastStart = Infinity;
        highlights.sort(function(a, b) {
            return b.start - a.start;
        }); // reverse sorts them
        $.each(highlights, function() {
            //log(this);
            if (lastStart >= this.end) { // prevent overlaps; - probably not the beest way to do; occurs when eg search for "mirror or"...; tokens used when preparing highlights should probably be sorted by length, longest first
                s = s.slice(0, this.start) + '<span class="' + className + '">' + s.slice(this.start, this.end) + '</span>' + s.slice(this.end);
            }
            lastStart = this.start;
        });
        return s;
    }

    function highlightTerms(term_freq, html) {
        // - highlight more if the term is rare
        try {
            var s = wipeHTML(html).toLowerCase();
            var exclude = 'i you why how have to it get the a an and at of me my can do let use with for in only is there where what was were will to from does on this that if'.split(' '); // or exclude any word that occurs in a large % of faqs
            var highlights = [];
            $.each(term_freq, function(term) {
                if (exclude.indexOf(term) == -1) {
                    var re = new RegExp(term + '\\b|\\b' + term, 'g'),
                        m;
                    while ((m = re.exec(s)) !== null)
                        highlights.push({
                            start: m.index,
                            end: re.lastIndex
                        });
                }
            });
            return highlightHTML(html, highlights, 'faqtoidHighlight');
        } catch (e) {
            // highlihgting fails on ie8
            return html;
        }
    }

    function search(s) {
        // - i'd debounce this if i had access to it
        var terms = (s /*$('#faqtoidSearch').val()*/ || '').toLowerCase().match(/\w{2,}/g) || [];
        var term_freq = {};
        //var answers = $.map(answers/*$.ui.faqtoid.prototype.answers*/, function(v, i) { return {q:v[0], a:v[1], i:i/*, score: score(i, v.join())*/ } })
        //terms.forEach(function(term) { // ie8 doesn't suport forEach
        $.each(terms, function(i, term) {
            if (!(term in term_freq)) {
                term_freq[term] = 0;
                $.each(answers, function(i, answer) {
                    if (answer.s.search(term) != -1)
                        term_freq[term]++;
                });
                // ? or could build an array of which faqs contain which terms to speed the op below; not that it's noticeably slow
            }
        });

        function score(answer) {
            var x = (answers.length - answer.i) / answers.length / 1000; // this default value causes answers to by default be sorted by order in answers file
            $.each(term_freq, function(term, freq) {
                var i = answer.s.toLowerCase().search(term);
                x += i != -1 ? 1 / (term_freq[term] + i / 100.0) : 0;
                //console.log([freq, term, i])
                // favors words that are in few answers, and words that are early in an answer
            });
            return x;
        }
        $.each(answers, function(i, answer) {
            answer.score = score(answer);
        }).sort(function(a, b) {
            return b.score - a.score;
        }); // $.each returns the array for chaining, unlike [].forEach
        $('#faqtoidMatches').html(highlightTerms(term_freq, $.map(answers.slice(0, answerSetSize), formatQuestion).join('')));
        //$('.faqtoidQuestion').each(function() { $(this).click(faqtoidClick) })
        /*if (answers.length > answerSetSize)
            $('#faqtoidMore').fadeIn()
        else
            $('#faqtoidMore').fadeOut()*/
        return answers;
    }

    function initSearch() {
        if (answers.length /*$.ui.faqtoid.prototype.answers*/ ) {
            if (answers.length <= answerSetSize)
                $('.faqtoidFAQSearch').slideUp();
            $('.faqtoidFAQs').slideDown();
            if (0) {
                var s = $.trim($('title').text().toLowerCase().match(/[\w ]+/)); // default search from page title so automatically relevant
                if (['help', 'contact', 'support'].indexOf(s) == -1)
                    $('#faqtoidSearch').val(s);
            }
            search($('#faqtoidSearch').val());
            //$(function() { $('#faqtoidSearch').select().focus() }) // annoying on iOS
        }
    }

    function appendThumbnail(videos) {
        var videoId = videos.shift();
        $.getJSON('https://www.googleapis.com/youtube/v3/videos?part=snippet&key=' + script.attr('data-youtube-key') + '&id=' + videoId, function(r) {
            //$('#faqtoidVideos').append('<a style="vertical-align: top; margin: 10px 10px 10px 0; display: inline-block; font-size: small; width: 120px; white-space: normal;" href="' + r.data.player.default + '" target=_blank title="Watch &quot;' + r.data.title + '&quot;"><img src="' + r.data.thumbnail.sqDefault + '">' /* + <br>' + r.data.title */ + '</a>')
            //$('#faqtoidVideos').append('<img style="cursor: pointer; margin: 0 10px 0 0;" src="' + r.data.thumbnail.sqDefault + '" + data-id="' + r.data.id + '" title="Watch &quot;' + r.data.title + '&quot;"><span style="display: inline-block; vertical-align: top; font-size: small; max-width: 120px; max-height: 80px; margin: 0 20px 0 0; overflow: none; white-space: normal;">' + r.data.title + '</span>');
            if ($('#faqtoidVideos').is(':empty'))
                $('#faqtoidVideos').append('<span style="display: inline-block; vertical-align: top; zfont-size: small; max-width: 120px; max-height: 80px; margin: 0 20px 0 0; overflow: none; white-space: normal; font-weight: bold;">Video<br>Tutorials</span>').show();
            $('#faqtoidVideos').append('<img style="cursor: pointer; margin: 0 10px 0 0;" src="' + r.items[0].snippet.thumbnails.default.url + '" + data-id="' + videoId + '" title="Watch &quot;' + r.items[0].snippet.title + '&quot;"><span style="display: inline-block; vertical-align: top; font-size: small; max-width: 120px; max-height: 80px; margin: 0 20px 0 0; overflow: none; white-space: normal;">' + r.items[0].snippet.title + '</span>');
            if (videos.length)
                appendThumbnail(videos); //.shift());
        });
    }

    function listVideos() {
        if (1) { // - if not over ssl, since youtube doesnt embed ssl right
            var videos = (script.attr('data-videos') || '').match(/[-\w]+/g) || [];
            if (videos.length) {
                // pop and get each video individually to preserve order
                appendThumbnail(videos); //.shift());
                // v but mousing over for titles doesn't work on touch screens
                // - add AddThis social sharing buttons to videos; maybe to answers too
                $('#faqtoidVideos')
                    /*.on('mouseenter', 'img', function(){ // no need to show title because youtube player does it
                                        $('#faqtoidVideoTitle').html($(this).attr('title')).stop().slideDown()
                                    }).on('mouseleave', 'img', function(){
                                        $('#faqtoidVideoTitle').slideUp()
                                    })*/
                    .on('click', 'img', function() {
                        $('#faqtoidVideoPlayer').height($('#faqtoidVideoPlayer').width() * 0.75).attr('src', '//www.youtube-nocookie.com/embed/' + $(this).attr('data-id') + '?rel=0').slideDown();
                    });
            }
        }
    }

    function getAnswers() {
        if (!answers.length /*$.ui.faqtoid.prototype.answers*/ ) {
            /*if (typeof faqtoids != 'undefined') { // if FAQ provieded as javascript global
                answers = faqtoids.map(function(x, i) { return {q: x[0], a: x[1], i: i, s: (x[0] + ' ' + x[1]).toLowerCase()} })
                initSearch()
                // answers list gets mutated when sorted so i store the orig index in each answer
            }
            else*/
            if ($('#faqtoids').length) {
                answers = [];
                //$($.parseHTML('<div>' + $('#faqtoids').text() + '</div>')).find('div.faq').each(function() { // for when was in script tag in head, but that's poor
                $('#faqtoids div.faq').each(function() {
                    // have to wrap <div> because .find misses top-level elements
                    var q = $(this).find('.question').html(),
                        a = $(this).find('.answer').html();
                    answers.push({
                        q: q,
                        a: a,
                        i: answers.length, //i++
                        s: (q + ' ' + a).toLowerCase()
                    });
                });
                initSearch();
            } else {
                $.get(script.attr('data-faqs') || 'faqtoids.txt', function(txt) {
                    //console.log('got answers')
                    var regex = /([^\n]+)\n([^\n]+)(\n+|$)/g;
                    answers /*$.ui.faqtoid.prototype.answers*/ = [];
                    var i = 0;
                    txt = txt.replace(/\r\n?/g, '\n');
                    while ((match = regex.exec(txt))) {
                        //log(match)
                        ///*$.ui.faqtoid.prototype.*/answers.push([match[1], match[2]])
                        answers.push({
                            q: match[1],
                            a: match[2],
                            i: i++,
                            s: (match[1] + ' ' + match[2]).toLowerCase()
                        });
                    }
                    initSearch();
                }, 'text');
            }
        }
    }

    function showDlg() {
        getAnswers();
        listVideos();
        var inputSelector = '#faqtoid textarea, #faqtoid input, #faqtoid button';
        $(inputSelector).attr('disabled', true); // to stop the problem where jqueyr ui dialog automatically focuses first form input; autofocusing is annoying on ios cuz it shows keyboard, and annoying on IE because (and probably elsehwere) cuz it loses textarea placeholder text
        //$('#faqtoid').css('overflow', $('body').css('overflow') == 'hidden' ? 'scroll' : 'auto')
        if ($('body').css('overflow') == 'hidden') {
            //$('#faqtoid').css('maxHeight', $(window).height() - 200)
            //$('#faqtoid').css('overflow', 'auto')
        }
        $('#stopFaqtoidTourTip').click(); // not nice to kill tour but otherwise it gets in the way
        //$(this).css('overflow', 'hidden') // prevent vert scrollbar
        $('.ui-widget-overlay').bind('click', function() {
            $(this).siblings('.ui-dialog').find('.ui-dialog-content').dialog('close');
        }); // closes dlg if user clicks outside it
        $(inputSelector).attr('disabled', false);
        //if ($('body').css('overflow') == 'hidden')
        //    $('#faqtoid').css('max-height', $(window).height() - 40 - ($('#faqtoid').parent().height() - $('#faqtoid').height())) // setting max-heihgt of faqtoid.parnet() breaks the dialog
        var offset = 15;
        if ($(window).width() > 700)
            $('.faqtoidWindow').css('max-width', '600px');
        $('#faqtoid').css({
            top: (offset + $(window).scrollTop()) + 'px',
            right: offset + 'px'
        }).fadeIn().drags(); //$('#faqtoid').modal('show')
    }

    /*
    $.widget("ui.faqtoid", {
		options: {
		    //answers: []
		},

		_create: function() {
		    //console.log('creating faqtoid')
            if (this.element.prop('tagName').toLowerCase() == 'div') {
                $('#faqtoid').css('display', 'block')
                $('#faqtoid').appendTo(this.element)
                getAnswers()
            } else { // it's a btn to popup the faqtoid dialog
                this._on(this.element, {click: function() {
                    //$('#faqtoid').dialog('open')
                    //$(faqtoidBody).dialog({
                    //console.log('creating dlg')
                    showDlg()
                    $('.showFaqtoid').fadeOut()
                    return false
                }})
            }
		},

		//destroy: function() {
			//this.element.next().remove()
			//$(window).unbind("resize")
		//}
    })
    */

    $(function() {
        //var faqtoidBody = ('\
        $('body').append('\
<div class="faqtoidWindow" id="faqtoid" style="display: none;">\
    <div class="faqtoidHeader">\
        <span class=hideFaqtoid style="float: right; font-weight: bold; font-size: 24px; margin-top: -10px;" title=Close>&times;</span>\
        <h4 class=faqtoidTitle>Help</h4>\
    </div>\
    <div class="faqtoidBody">\
        <div id=faqtoidVideos style="display: none; overflow: auto; white-space: nowrap; margin: 0 0 1em 0;"></div>\
        <iframe id=faqtoidVideoPlayer style="display: none; width: 100%; max-height: 90vh; margin: 0 auto 1em auto; border: 1px solid black;" frameborder="0" allowfullscreen></iframe>\
        <form id=faqtoidForm action="javascript:">\
        <div class=faqtoidFAQs style="display: none;">\
            <div class=faqtoidFAQSearch>\
                <p><b>Search Common Questions</b></p>\
                <input id=faqtoidSearch style="display: block; width: 100%;" name=message title="Search answers to common questions">\
            </div>\
            <!--<p><b>Answers to Common Questions</b>-->\
            <ol id=faqtoidMatches><li><span class="spinner"></span> Loading&hellip;</ol>\
            <!--<button id=faqtoidMore>More</button>-->\
        </div>\
        <button class="faqtoidBtn faqtoidBlockBtn" style="margin-bottom: 0;" id=faqtoidShowMailForm>Send a Question</button><!-- "Can\'t Find an Answer?" -->\
        <div id=faqtoidSidebar></div>\
        <div id=faqtoidMailForm style="display: none;">\
            <b>Message</b>\
            <p style="font-size: small;">If you\'re having a problem, please be specific about what you\'re trying to do and what\'s going wrong.\
            <textarea style="margin-top: 5px; display: block; width: 100%;" id=faqtoidMessage name=message title="Enter your message here." zplaceholder="Please tell me specifically what you\'re trying to do and what\'s going wrong." rows=5 required></textarea>\
            <table class=faqtoidEmailDiv><tr>\
                <td>Email</td>\
                <td style="padding-left: 5px; width: 100%;"><input name=email type=email required title="Enter your e-mail address here" placeholder="Please ensure it\'s correct" id=faqtoidEmail></td>\
            </tr></table>\
            <p class=faqtoidMsg id=faqtoidSuccess style="display: none; margin: 10px 0;">Thanks for your message. I check email Monday to Friday in the Eastern North America time zone. You might have to check your junk/spam folder for my reply.</p>\
            <button type=submit class="faqtoidBtn faqtoidBlockBtn" style="margin-bottom: 0;">Send</button>\
        </div>\
        </form>\
        <p style="text-align: center; font-size: small; opacity: 0.8; margin: 1em 0;">Help powered by <a href="http://faqtoid.patrickroberts.ca/" target="_blank">FAQtoid</a></p>\
    </div>\
</div>\
');

        var qsRe = /([^&=]+)=([^&]*)/g,
            queryParamMatch, queryParams = {};
        while ((queryParamMatch = qsRe.exec(location.search.slice(1))))
            queryParams[decodeURIComponent(queryParamMatch[1])] = decodeURIComponent(queryParamMatch[2]);
        var cookieEmailMatch = document.cookie.match(/\bemail=([^;]+)/i);
        $('#faqtoidForm input[name=email]').val(queryParams.email || (cookieEmailMatch && unescape(cookieEmailMatch[1])));

        $('#faqtoidMore').click(function() {
            var n = $('#faqtoidMatches li').length;
            $('#faqtoidMatches').append(answers.slice(n, n + answerSetSize).map(formatQuestion));
            if (answers.length <= n + answerSetSize)
                $('#faqtoidMore').fadeOut();
            return false;
        });

        $('#faqtoidShowMailForm').click(function(e) {
            if (!$('#faqtoidMailForm textarea').val()) { // otherwise got wiped out if user pressed enter in email field
                $('#faqtoidMailForm textarea').val($('#faqtoidSearch').val()); // || "Hi\n\n");
            }
            $(this).fadeOut(undefined, function() {
                $('#faqtoidMailForm').slideDown(
                    400,
                    function() { // to ensure mail form visible
                        //$('.faqtoidWindow').scrollTop(10000000)
                        if ($('.faqtoidWindow').length)
                            $('.faqtoidWindow').animate({
                                scrollTop: $('.faqtoidWindow')[0].scrollHeight
                            });
                    }
                );
                if (sidebar)
                    $('#faqtoidSidebar').slideDown();
                //$('#faqtoidMailForm, #faqtoidSidebar').slideDown(undefined, function() {
                //$('#faqtoid input[type=submit]')[0].scrollIntoView() -- this func stinks
                //$('#faqtoid input[type=email]').width($('#faqtoid input[type=submit]').position().left - $('#faqtoid input[type=email]').position().left - 12)
                //})
            });
            e.preventDefault();
            $.getScript('https://cdnjs.cloudflare.com/ajax/libs/UAParser.js/0.7.10/ua-parser.min.js');
        });

        var sidebar = $(window).width() > 768 && script.attr('data-sidebar');
        if (sidebar) {
            var w = 120;
            $('#faqtoidMailForm').css('margin-right', w + 15);
            $('#faqtoidSidebar').css('width', w);
            $('#faqtoidSidebar').html(sidebar); //.show()
        }
        var mailscript = script.attr('data-mailscript') || script.attr('data-mailto'); // important that mail script trumps mailto, with mailto as fallback
        $('#faqtoidShowMailForm').css('display', mailscript ? 'block' : 'hidden');

        var lastSentMessage;
        $('#faqtoidForm').submit(function(event) {
            event.preventDefault();
            // ? cross domain scripting issues
            // - remember email address used; at least in localStorage, overriding any given value
            try { // clean up message
                var msg = $('#faqtoidForm textarea'),
                    msgText = $.trim(msg.val());
                if (msgText.toUpperCase() === msgText) { // if crazy person all uppercase message
                    //if (str.replace(/[^A-Z]/g, "").length / msg.val().length > 0.5) // if most letters are capitlized; - probably exclude URLs etc before counting or only count capitlized letters in words
                    msgText = msgText.replace(/\w[^.]*\.?/g, function(m) {
                        return m[0] + m.substr(1).toLocaleLowerCase();
                    });
                }
                msgText = msgText.replace(/([.!?,]){2,}/g, '\$1'); // remove repeated punctuation
                msgText = msgText.replace(/!(?=\s|$)/gm, '.'); // no need for excalmations outside of urls
                msg.val(msgText);
            } catch (e) {}
            if ($('#faqtoidForm input[name=email]').length && !$('#faqtoidForm input[name=email]').val()) { // ie<10 doesn't show placeholder and doesn't require fields, so have to show something
                alert("Please enter your e-mail address.");
                $('#faqtoidForm input[name=email]').focus();
                //event.preventDefault()
                return;
            }
            if (/\b(shit(ty)?|fuck(ing|er)?|bastard|crap|asshole|bitch|cunt)s?\b/i.test($('#faqtoidForm textarea').val())) {
                alert("No foul language allowed.");
                //event.preventDefault()
                return;
            }
            if ($.trim($('#faqtoidForm textarea').val()).length < 12) {
                alert("Please enter a complete message.");
                $('#faqtoidForm textarea').focus();
                //event.preventDefault()
                return;
            }
            if ($('#faqtoidForm textarea').val() == lastSentMessage) {
                alert("You recently sent the same message.");
                //event.preventDefault()
                return;
            }
            var params = {
                    subject: script.attr('data-mailsubject') || location.hostname.replace(/^www\./i, '').replace(/(?:^|\b)\S/g, function(s) {
                        return s.toUpperCase();
                    }) || 'Message',
                    URL: location.toString(),
                    title: $.trim($('title').text() || location.pathname || 'Untitled'),
                    date: Date(),
                    'User Agent': navigator.userAgent
                },
                uaParseResult, message = $('#faqtoidForm textarea').val(),
                words, sentences, sentenceWords, sentiment = 0,
                cookies = {},
                forms = {},
                html, messageSubject; // ? cant multiple cookies and forms have same name

            message = escapeHtml(message); // escape tags in message; not a security issue though since any email client or ticketing system filters bad html in emails

            try {
                if (document.referrer) {
                    params.Referrer = document.referrer;
                }
                if (uncaughtErrors.length) {
                    params['Uncaught JavaScript Errors'] = JSON.stringify(uncaughtErrors);
                }

                //if (location.protocol == 'http:') { // when doing everyting over ssl, will need a more specific way to avoid faqtoid picking up credcard details and other sensitive info: class=card-number or autocomplete=off or is a password
                $.each($('input, textarea, select'), function() {
                    var field = $(this),
                        name = $(this).attr('name') || $(this).attr('id'),
                        form = $(this).parents('form'),
                        formName = form.attr('name') || 'Unnamed',
                        v;
                    if (name && form.attr('id') != 'faqtoidForm' && !/off|cc|password/i.test(field.attr('autocomplete')) && !/password/i.test(field.attr('type'))) {
                        v = (!$(this).is(':checkbox') || $(this).is(':checked')) ? $(this).val() : '';
                        if (!forms.hasOwnProperty(formName)) {
                            forms[formName] = {};
                        }
                        v = escapeHtml(v);
                        forms[formName][name] = v;
                        params['form>' + (form.attr('name') || '') + '>' + name] = v;
                    }
                });
                $('[contenteditable=true]').each(function () {
                    var heading = "Editable Elements";
                    if (!forms.hasOwnProperty(heading)) {
                        forms[heading] = {};
                    }
                    forms[heading][$(this).attr('id') || 'Unnamed'] = escapeHtml($(this).html());
                });
                if (script.attr('data-include-cookies')) {
                    $.each(document.cookie.split(/; */), function() {
                        var kv = this.split('=');
                        if (kv[0] && kv[0] !== 'password' && !/^_/i.test(kv[0])) {
                            cookies[kv[0]] = decodeURIComponent(kv[1]);
                            params['cookie>' + kv[0]] = unescape(kv[1]);
                        }
                    });
                }
                if (0) {
                    var storeLimit = 50;
                    $.each({
                        local: localStorage,
                        session: sessionStorage
                    }, function(storeName, store) {
                        for (var i = 0; i < store.length; i++) {
                            var k = store.key(i),
                                s = store[k].toString();
                            params[storeName + '>' + k] = s.substr(0, storeLimit) + (s.length > storeLimit ? '...' : '');
                        }
                    });
                }
                //}

                if (window.UAParser) {
                    uaParseResult = UAParser();
                    params['User Agent'] = $.trim([uaParseResult.device.vendor, uaParseResult.device.type, uaParseResult.device.model, uaParseResult.os.name, uaParseResult.os.version, uaParseResult.browser.name, uaParseResult.browser.version, uaParseResult.cpu.architecture].join(' ')) + ('ontouchstart' in window ? ' Touch' : '');
                }
                params.Screen = screen.width + ' x ' + screen.height;

                /*if (/\b(please|thank you|thanks|hi|hello|dear)\b/i.test(message)) {
                    // dropped because emojis cut off the subject line in freshdesk
                    params.subject += ' ' + emoji(0x1F600, ':)');
                }*/

                words = message.match(/[-\w']+/g) || [];
                sentences = message.match(/[A-Z][-';,)(:#%\/\w\s]{8,}[\.?!]/g) || []; // intentionally strict to punish bad punctuation; - needs to handle "Blah Mr. Roberts etc."
                sentenceWords = sentences.join().match(/[-\w]+/g) || [];
                /*{//if (sentences.length && sentenceWords.length) {
                    //params.subject += ' ' + (5.88 * average($.map(sentenceWords, function(word) { return word.length; })) - 0.296 * sentences.length / sentenceWords.length - 15.8); // https://en.wikipedia.org/wiki/Coleman%E2%80%93Liau_index
                    params.subject += ' #G' + Math.round(4.71 * average($.map(sentenceWords, function (word) { return word.length; })) + 0.5 * sentenceWords.length / (sentences.length || 1) - 21.43); // https://en.wikipedia.org/wiki/Automated_readability_index
                    //console.log(sentences, $.map(sentenceWords, function(word) { return word.length; }));
                }*/
                /*$.each(words, function (i, token) {
                    sentiment += AFINN[token.toLocaleLowerCase()] || 0;
                    //console.log(token, token.toLocaleLowerCase(), AFINN[token.toLocaleLowerCase()], sentiment);
                });*/
                /*if (sentences.length) {
                    params.subject += ' ' + emoji(0x1F393, '|:)'); // diploma
                }*/
                // http://unicode.org/emoji/charts/full-emoji-list.html#1f604
                ////params.subject += ' #L' + words.length;
                //params.subject += ' (' + words.length + ')';
                ////params.subject += ' #G' + (/[a-z][.?!]\n{2,}[A-Z]/.test(message) ? 2 : (sentences.length ? 1 : 0)); // 0=no-sentnecs,1=sentences,2=paragraphs -- grade level useless for emails
                if (sentiment) {
                    params.subject += /* ' #S' + */ (sentiment > 0 ? '+' : '-'); //Math.round(sentiment / words.length);
                }
                if (/\b(refund|cancel|urgent|password|unsubscribe|money|ASAP|login)\b/i.test(message)) {
                    params.subject += ' #Priority';
                }
                if (/\b(price)\b/i.test(message) || /\b(buy)/i.test(location.pathname)) {
                    params.subject += ' #Lead';
                }
                params.subject += ' [' + ellipsis(params.title, 24) + ']';
                messageSubject = $.trim((message.match(/[-\w,' ]{15,}[.?]/) || [message])[0]);
                if (messageSubject) {
                    params.subject += ' "' + ellipsis(messageSubject.replace(/\s+/g, ' '), 40) + '"';
                }
                // - add plain text versions of errors:text, forms:text, cookies, etc -- also, in that case, var really shouldn't be called 'html' since html not allowed in mailto body
                html = /@/.test(mailscript) ? '{{message}}\n\n\n\nSent from "{{title}}" {{url}} via "{{referrerTitle}}" {{referrer}}\n\nUsing {{user_agent}} ({{screen}})' : '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Support Message</title><style>body { font-family: sans-serif; font-size: 16pt; max-width: 800px; margin: 1em auto; padding-left: 1em; padding-right: 1em; } span { font-weight: bold; display: inline-block; width: 10em; }</style></head><body>{{message}}<hr><p>From {{name}} {{email}} on {{date}}<br>Sent from <a href="{{url}}">{{title}}</a> (previously on <a href="{{referrer}}">{{referrerTitle}}</a>)<br>Using {{user_agent}} ({{screen}} pixels)</p><br>{{answers}}</div><div>{{errors}}</div><div>{{forms}}</div><div>{{cookies}}</div><div>{{user_record}}</div><br><p>Sent by {{mail_script}} from {{remote_ip}}</p></div></body></html>';
                //'<!DOCTYPE html><html><head><meta charset="utf-8"><title>Support Message</title><style>body { font-family: sans-serif; font-size: 16pt; max-width: 800px; margin: 1em auto; padding-left: 1em; padding-right: 1em; } span { font-weight: bold; display: inline-block; width: 10em; }</style></head><body><div style="margin-bottom: 1em;">From {{name}} {{email}} on {{date}}<br>At <a href="{{url}}">{{title}}</a> via <a href="{{referrer}}">{{referrerTitle}}</a><br>Using {{user_agent}} ({{screen}})</div><hr><p>{{message}}<hr><div style="font-size: 60%;"><div>{{answers}}</div><div>{{errors}}</div><div>{{forms}}</div><div>{{cookies}}</div><div>{{user_record}}</div><hr><p>Sent by {{mail_script}} from {{remote_ip}}</p></div></body></html>';
                html = html.replace(/{{email}}/g, $('#faqtoidForm input[name=email]').val());
                html = html.replace('{{message}}', message.replace(/[\r\n]+/g, '<br><br>')); // BR more reliable than P for formatting
                html = html.replace('{{title}}', params.title);
                html = html.replace('{{referrer}}', params.Referrer || '');
                html = html.replace('{{referrerTitle}}', ellipsis(params.Referrer || 'unknown referrer', 80));
                html = html.replace('{{user_agent}}', params['User Agent']);
                html = html.replace('{{screen}}', params.Screen);
                html = html.replace(/{{url}}/g, params.URL);
                html = html.replace('{{date}}', params.date);
                var span = '<span style="font-weight: bold; display: inline-block; width: 10em;">'; // freshdesk ignores <sytyle> css so i put it inline here and in the H2/H3
                html = html.replace('{{forms}}', $.isEmptyObject(forms) ? '' : '<h2 style="margin-top: 1em;">Forms</h2>' + $.map(forms, function(form, k) {
                    return '<div><h3 style="margin-top: 0.5em;">' + k + '</h3><div>' + $.map(form, function(v, k) {
                        //return '<p><span>' + k + '</span> ' + v;
                        return '<p>' + span + k + '</span> ' + v;
                    }).join('') + '</div>';
                }).join(''));
                html = html.replace('{{cookies}}', $.isEmptyObject(cookies) ? '' : '<h2 style="margin-top: 1em; margin-bottom: 0.5em;">Cookies</h2>' + $.map(cookies, function(v, k) {
                    //return '<p><span>' + k + '</span> ' + v;
                    return '<p>' + span + k + '</span> ' + v;
                }).join(''));

                if (answers.length) {
                    search(message);
                    html = html.replace('{{answers}}', answers && answers.length ? '<h2>Related Answers</h2><ol style="font-size: initial;">' + $.map(answers.slice(0, answerSetSize), formatQuestion).join('') + '</ol>' : ''); // uses initial font size for answers so can be easily copied into reply
                } else
                    html = html.replace('{{answers}}', '');

                html = html.replace('{{errors}}', uncaughtErrors.length ? '<h2 style="margin-top: 1em; margin-bottom: 0.5em;">Errors</h2>' + $.map(uncaughtErrors.slice(-20), function(error) {
                    return '<p>' + error.at + '<br>' + (error.arguments[1] || 'UnknownScriptURL') + ':' + error.arguments[2] + ' ' + error.arguments[0];
                }).join('') : '');

                //log(forms, cookies, params, html);
                params.html = html;
            } catch (e) {} // just so a failure in this inessential code doesnt stop msgs

            //data = $('#faqtoidForm').serialize() + '&' + $.param(params)
            $('.faqtoidMsg').slideUp();
            if (/@/.test(mailscript)) {
                location = 'mailto:' + mailscript + '?subject=' + encodeURIComponent(params.subject) + '&body=' + encodeURIComponent(params.html || message); // cant use $.param beacuse it uses '+'s to encode spaces
            } else {
                $('#faqtoidForm button[type=submit]').attr('disabled', 'disabled').text('Sending');
                // - add spinner
                var backupEmail = script.attr('data-mailto'),
                    backupEmailMsg = /@/.test(backupEmail) ? (' or email me at ' + backupEmail) : '';
                $.ajax(mailscript, {
                    type: 'POST',
                    data: $('#faqtoidForm').serialize() + '&' + $.param(params),
                    dataType: 'json',
                    success: function(response) {
                        if (response.success) {
                            lastSentMessage = $('#faqtoidForm textarea').val();
                            $('.faqtoidMsg').slideDown();
                            //$('.faqtoidMsg')[0].scrollIntoView() // so often works badly
                        } else {
                            //if (response.error)
                            alert("There was a problem sending your message. Please retry" + backupEmailMsg + ".\n\nError: " + (response.error || 'unknown'));
                        }
                    },
                    complete: function() {
                        $('#faqtoidForm button[type=submit]').removeAttr('disabled').text('Send');
                    },
                    error: function(req, status, error) {
                        alert("There was a problem sending your message. Please retry" + backupEmailMsg + ".\n\n" + status + ' ' + error);
                    }
                });
            }
        });

        $('#faqtoidMatches').on('click', '.faqtoidQuestion', function(e) {
            e.preventDefault();
            var i = $(this).attr('answer'),
                otherAnswers = $('.faqtoidAnswer[answer!=' + i + ']');
            try { // try to track questions clicked on using google analytics
                //log('showing answer to: ' + answers[i].q)
                _gaq.push(['_trackPageview', '/faqtoid/' + answers[i].q]);
            } catch (err) {}
            if (otherAnswers.length) {
                otherAnswers.slideUp(200, function() {
                    $('.faqtoidAnswer[answer=' + i + ']').slideDown();
                });
            } else {
                $('.faqtoidAnswer[answer=' + i + ']').slideDown();
            }
        });
        $('#faqtoidMatches').on('mouseover', '.faqtoidQuestion', function() {
            $('#faqtoidSearch, #faqtoidMessage').blur();
        }); // to fix weird problem where first click on question, after searching, was ignored; occurred at least on chrome; - still not right in iOS

        //$('#faqtoidSearch').on('keyup change', function() { search() })
        $('#faqtoidSearch, #ZZZfaqtoidMessage').on('keyup change', function() {
            search($(this).val());
        }); // now i no longer change search results on mail form change because that causes the vertical position of the mail form to annoyingly change while typing
        if (0) $('#faqtoidSearch').on('keyup change', function() {
            // autogrow textarea height
            // this would kill chrome when you type a lot of lines when browser zoomed out
            var o = $(this);
            while (o.outerHeight() < o[0].scrollHeight + parseFloat(o.css('borderTopWidth')) + parseFloat(o.css('borderBottomWidth')))
                o.height(o.height() + 1);
        });

        if (!window.onerror) {
            window.onerror = function( /*errorMsg, url, lineNumber*/ ) {
                uncaughtErrors.push({
                    at: Date(),
                    arguments: arguments
                });
            };
        }
        //setTimeout(function () { cvbnm / 0; }, 1); // test uncaught error handling

        if ($('div#inlineFaqtoid').length) {
            $('.showFaqtoid, .faqtoidHeader').hide(); //fadeOut()
            //$('#inlineFaqtoid').faqtoid()
            //$('#faqtoid').css('display', 'block')
            $('#faqtoid').removeClass('faqtoidWindow').appendTo($('div#inlineFaqtoid')).show();
            getAnswers();
            listVideos();
        } else {
            //$('.showFaqtoid').faqtoid()
            $('.showFaqtoid').click(function(e) {
                e.preventDefault();
                showDlg();
            });
        }

        function hideFaqtoid() {
            $('#faqtoid').fadeOut();
        }
        $('.hideFaqtoid').click(hideFaqtoid);

        // from http://css-tricks.com/snippets/jquery/draggable-without-jquery-ui/ -- worked better than jquery ui draggable
        // - add touchscreen event for dragging on iphone
        $.fn.drags = function(opt) {
            var $el; // patrick: one of my changes to pass linting
            opt = $.extend({
                handle: "",
                cursor: "move"
            }, opt);

            if (opt.handle === "") {
                $el = this;
            } else {
                $el = this.find(opt.handle);
            }

            return $el.css('cursor', opt.cursor).on("mousedown", function(e) {
                //console.log(this)
                //console.log(e)
                var $drag; // patrick: another change to pass linting
                if (['INPUT', 'TEXTAREA'].indexOf(e.target /*toElement*/ .nodeName) != -1) // patrick: otherwise input fields are broken
                    return;
                if (opt.handle === "") {
                    $drag = $(this).addClass('draggable');
                } else {
                    $drag = $(this).addClass('active-handle').parent().addClass('draggable');
                }
                var z_idx = $drag.css('z-index'),
                    drg_h = $drag.outerHeight(),
                    drg_w = $drag.outerWidth(),
                    pos_y = $drag.offset().top + drg_h - e.pageY,
                    pos_x = $drag.offset().left + drg_w - e.pageX;
                $drag.css('z-index', 1000).parents().on("mousemove", function(e) {
                    $('.draggable').offset({
                        top: e.pageY + pos_y - drg_h,
                        left: e.pageX + pos_x - drg_w
                    }).on("mouseup", function() {
                        $(this).removeClass('draggable').css('z-index', z_idx);
                    });
                });
                e.preventDefault(); // disable selection
            }).on("mouseup", function() {
                if (opt.handle === "") {
                    $(this).removeClass('draggable');
                } else {
                    $(this).removeClass('active-handle').parent().removeClass('draggable');
                }
            });
        };

        if (!answers.length && !script.attr('data-videos'))
            $('#faqtoidShowMailForm').trigger('click');

        if (/@/.test(mailscript))
            $('.faqtoidEmailDiv').remove();

        var currentStepI = 0;
        var borderRadius = 15; //$('#faqtoidTourTip').css('border-radius') didn't work in firefox
        var lastSel;

        function showStep(offset) {
            var step = $(tour[currentStepI += offset]);
            $('#prevFaqtoidTourTip').css('display', currentStepI === 0 ? 'none' : 'inline');
            $('#nextFaqtoidTourTip').css('display', currentStepI == tour.length - 1 ? 'none' : 'inline');
            $('#faqtoidTourTip > div:last').html(step.html());
            $('#faqtoidTourTip').css('border-radius', borderRadius);
            var sel = step.attr('data-for') || step.attr('data-sel');
            if (!sel && step.attr('data-id'))
                sel = '#' + step.attr('data-id');
            //log('faqtoid:', sel)
            var centredOn;
            var using = function(css, calc) {
                $('#faqtoidTourTip').animate(
                    css,
                    200,
                    'linear',
                    function() {
                        if (sel) {
                            var top = $(document).scrollTop();
                            //var y = $('#faqtoidTourTip').offset().top // y was 0 before tip first shown
                            //var y = $(sel).offset().top + $(sel).height() * (centredOn ? 0.5 : 1) // safer than using offset of hidden tour tip -- but isnt it showing now? and fails if tip is centred on element and higher than it
                            var y = Math.min($(sel).offset().top + $(sel).height() * (centredOn ? 0.5 : 1), $(this).offset().top);
                            //log('scrolling to tour tip:', sel, top, y)
                            // - in very wide page, may need to scroll horz
                            if (y - 100 < top) // tip above window so scroll up
                                $('html, body').animate({
                                scrollTop: y - 100
                            });
                            else { // tip below window so scroll down
                                var windowH = $(window).height();
                                if (y + $('#faqtoidTourTip').height() + 20 > top + windowH)
                                    $('html, body').animate({
                                        scrollTop: y - windowH / 2
                                    });
                            }
                        }
                    }
                );
            };
            var wasShown = $('#faqtoidTourTip').is(':visible');
            $(lastSel).removeClass('faqtoidTourHighlight');
            lastSel = sel;
            if (sel) {
                if ($(sel).length && $(sel).is(':visible')) {
                    $(sel).addClass('faqtoidTourHighlight');
                    var pos = step.attr('data-pos');
                    if (pos) { // == 'center') {
                        centredOn = sel;
                        $('#faqtoidTourTip').show().position({
                            my: pos,
                            at: pos,
                            of: sel,
                            using: using
                        });
                    } else {
                        var side = ($(sel).offset().left /*+ $(sel).width() / 2*/ ) > $(window).width() / 2 ? 'right' : 'left'; // to deal with tip sticking off right edge since i can't use collision: fit' in firefox
                        $('#faqtoidTourTip').css(side == 'left' ? 'border-top-left-radius' : 'border-top-right-radius', 0);
                        centredOn = false;
                        $('#faqtoidTourTip').show().position({
                            my: side + ' top+10',
                            at: side + ' bottom',
                            of: sel,
                            within: $('body'),
                            collision: 'none', // in firefox, 'fit' worked poorly for elements near right edge
                            using: using
                        });
                    }
                } else
                    showStep(offset);
                //[0].scrollIntoView() -- works poorly
            } else {
                centredOn = window;
                $('#faqtoidTourTip').show().position({
                    of: window,
                    using: using
                }).position({
                    of: window,
                    using: using
                }); // for some reason have to do this twice in chrome/safari
            }
            if (!wasShown)
                $('#faqtoidTourTip').hide().fadeIn();
        }

        var tour = $('#faqtoidTour > li').hide();
        if (tour.length) {
            //$('#faqtoid').prepend('<div style="margin: 10px 0;">This page has a tour that explains all its parts: <button class=startFaqtoidTour style="font-size: 45%; margin-left: 10px; display: inline-block; vertical-align: middle;">Take the Tour</button></div>')
            $('#faqtoid .faqtoidBody').prepend('<button style="width: 100%; margin-top: 0;" class="startFaqtoidTour faqtoidBtn faqtoidBlockBtn faqtoidPrimaryBtn" title="Takes you on a tour of the page, telling you how each part works">Show Instructions</button>'); // - should reveal, not prepend it
            var tourTitle = $('#faqtoidTour').attr('data-title') || $('#faqtoidTour').attr('title');
            if (0 && tourTitle)
                $('#faqtoid .startFaqtoidTour').text("Show Instructions on " + tourTitle);
            $('body').append('\
<div id=faqtoidTourTip>\
    <div>\
        <div>\
            <span id=prevFaqtoidTourTip title=Previous>&lt;<!-- &#9664; cant use obscure entities since not consistently available in whatever font is being used --></span>\
            <span id=stopFaqtoidTourTip title="Close tour" style="cursor: pointer;">&times;<!--&#10006;--></span>\
            <span id=nextFaqtoidTourTip class=ziconNext title=Next>&gt;<!--&#9654;--></span>\
        </div>\
        Tour\
    </div>\
    <div></div>\
</div>'); // &#10094;/10095 chevron wasnt in font on windows -- best just to get pure css icons

            //$('#faqtoidTourTip').draggable() //weird offset problem
            $('#faqtoidTourTip').drags();

            $('#faqtoidTourTip').dblclick(function() {
                $('#stopFaqtoidTourTip').click();
            });
            $('#prevFaqtoidTourTip').click(function() {
                showStep(-1);
            });
            $('#nextFaqtoidTourTip').click(function() {
                showStep(+1);
            });
            $('#stopFaqtoidTourTip').click(function() {
                // - maybe trigger stopFaqtoidTourTip.click from showDlg, or get the z-ordering right
                $(lastSel).removeClass('faqtoidTourHighlight');
                $('#faqtoidTourTip').fadeOut();
            });
            $('.startFaqtoidTour').click(function(e) {
                e.preventDefault();
                hideFaqtoid(); //$('#faqtoid').modal('hide')//dialog('close')
                $('.showFaqtoid').show(); //.fadeIn()
                showStep(-currentStepI);
            });
            if (1) { // remember not to rerun tour automatically on more than first visit
                var storageTestKey = '_testLocalStorage',
                    localStorageBroken, k = 'faqtoidToured:' + window.location.pathname;
                try {
                    localStorage.setItem(storageTestKey, 1);
                    localStorage.removeItem(storageTestKey);
                } catch (e) {
                    localStorageBroken = true; // safari private browsing, desktop & ios, has localstorage object but with 0 size limit
                }
                if (!localStorageBroken && !localStorage.getItem(k)) {
                    localStorage.setItem(k, 'true');
                    //if (['off', 'false', 'no'].indexOf($('#faqtoidTour').attr('data-auto')) == -1)
                    if (['on', 'true', 'yes'].indexOf($('#faqtoidTour').attr('data-auto')) != -1)
                        setTimeout(function() {
                            showStep(-currentStepI);
                        }, 250); // ensures ctrls have time to be setup
                }
            }
            //$('.runTour').show().click(function(){ runTour(); return false })
            //window.faqtoidStartTour = function() { showStep(-currentStepI) }
        }
    });
})(jQuery);

/*!
 * jQuery UI Position @VERSION
 * http://jqueryui.com
 *
 * Copyright 2014 jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 *
 * http://api.jqueryui.com/position/
 */
(function(factory) {
    if (typeof define === "function" && define.amd) {

        // AMD. Register as an anonymous module.
        define(["jquery"], factory);
    } else {

        // Browser globals
        factory(jQuery);
    }
}(function($) {
    (function() {

        $.ui = $.ui || {};

        var cachedScrollbarWidth, supportsOffsetFractions,
            max = Math.max,
            abs = Math.abs,
            round = Math.round,
            rhorizontal = /left|center|right/,
            rvertical = /top|center|bottom/,
            roffset = /[\+\-]\d+(\.[\d]+)?%?/,
            rposition = /^\w+/,
            rpercent = /%$/,
            _position = $.fn.position;

        function getOffsets(offsets, width, height) {
            return [
                parseFloat(offsets[0]) * (rpercent.test(offsets[0]) ? width / 100 : 1),
                parseFloat(offsets[1]) * (rpercent.test(offsets[1]) ? height / 100 : 1)
            ];
        }

        function parseCss(element, property) {
            return parseInt($.css(element, property), 10) || 0;
        }

        function getDimensions(elem) {
            var raw = elem[0];
            if (raw.nodeType === 9) {
                return {
                    width: elem.width(),
                    height: elem.height(),
                    offset: {
                        top: 0,
                        left: 0
                    }
                };
            }
            if ($.isWindow(raw)) {
                return {
                    width: elem.width(),
                    height: elem.height(),
                    offset: {
                        top: elem.scrollTop(),
                        left: elem.scrollLeft()
                    }
                };
            }
            if (raw.preventDefault) {
                return {
                    width: 0,
                    height: 0,
                    offset: {
                        top: raw.pageY,
                        left: raw.pageX
                    }
                };
            }
            return {
                width: elem.outerWidth(),
                height: elem.outerHeight(),
                offset: elem.offset()
            };
        }

        $.position = {
            scrollbarWidth: function() {
                if (cachedScrollbarWidth !== undefined) {
                    return cachedScrollbarWidth;
                }
                var w1, w2,
                    div = $("<div style='display:block;position:absolute;width:50px;height:50px;overflow:hidden;'><div style='height:100px;width:auto;'></div></div>"),
                    innerDiv = div.children()[0];

                $("body").append(div);
                w1 = innerDiv.offsetWidth;
                div.css("overflow", "scroll");

                w2 = innerDiv.offsetWidth;

                if (w1 === w2) {
                    w2 = div[0].clientWidth;
                }

                div.remove();

                return (cachedScrollbarWidth = w1 - w2);
            },
            getScrollInfo: function(within) {
                var overflowX = within.isWindow || within.isDocument ? "" :
                    within.element.css("overflow-x"),
                    overflowY = within.isWindow || within.isDocument ? "" :
                    within.element.css("overflow-y"),
                    hasOverflowX = overflowX === "scroll" ||
                    (overflowX === "auto" && within.width < within.element[0].scrollWidth),
                    hasOverflowY = overflowY === "scroll" ||
                    (overflowY === "auto" && within.height < within.element[0].scrollHeight);
                return {
                    width: hasOverflowY ? $.position.scrollbarWidth() : 0,
                    height: hasOverflowX ? $.position.scrollbarWidth() : 0
                };
            },
            getWithinInfo: function(element) {
                var withinElement = $(element || window),
                    isWindow = $.isWindow(withinElement[0]),
                    isDocument = !!withinElement[0] && withinElement[0].nodeType === 9;
                return {
                    element: withinElement,
                    isWindow: isWindow,
                    isDocument: isDocument,
                    offset: withinElement.offset() || {
                        left: 0,
                        top: 0
                    },
                    scrollLeft: withinElement.scrollLeft(),
                    scrollTop: withinElement.scrollTop(),
                    width: isWindow ? withinElement.width() : withinElement.outerWidth(),
                    height: isWindow ? withinElement.height() : withinElement.outerHeight()
                };
            }
        };

        $.fn.position = function(options) {
            if (!options || !options.of) {
                return _position.apply(this, arguments);
            }

            // make a copy, we don't want to modify arguments
            options = $.extend({}, options);

            var atOffset, targetWidth, targetHeight, targetOffset, basePosition, dimensions,
                target = $(options.of),
                within = $.position.getWithinInfo(options.within),
                scrollInfo = $.position.getScrollInfo(within),
                collision = (options.collision || "flip").split(" "),
                offsets = {};

            dimensions = getDimensions(target);
            if (target[0].preventDefault) {
                // force left top to allow flipping
                options.at = "left top";
            }
            targetWidth = dimensions.width;
            targetHeight = dimensions.height;
            targetOffset = dimensions.offset;
            // clone to reuse original targetOffset later
            basePosition = $.extend({}, targetOffset);

            // force my and at to have valid horizontal and vertical positions
            // if a value is missing or invalid, it will be converted to center
            $.each(["my", "at"], function() {
                var pos = (options[this] || "").split(" "),
                    horizontalOffset,
                    verticalOffset;

                if (pos.length === 1) {
                    pos = rhorizontal.test(pos[0]) ?
                        pos.concat(["center"]) :
                        rvertical.test(pos[0]) ? ["center"].concat(pos) : ["center", "center"];
                }
                pos[0] = rhorizontal.test(pos[0]) ? pos[0] : "center";
                pos[1] = rvertical.test(pos[1]) ? pos[1] : "center";

                // calculate offsets
                horizontalOffset = roffset.exec(pos[0]);
                verticalOffset = roffset.exec(pos[1]);
                offsets[this] = [
                    horizontalOffset ? horizontalOffset[0] : 0,
                    verticalOffset ? verticalOffset[0] : 0
                ];

                // reduce to just the positions without the offsets
                options[this] = [
                    rposition.exec(pos[0])[0],
                    rposition.exec(pos[1])[0]
                ];
            });

            // normalize collision option
            if (collision.length === 1) {
                collision[1] = collision[0];
            }

            if (options.at[0] === "right") {
                basePosition.left += targetWidth;
            } else if (options.at[0] === "center") {
                basePosition.left += targetWidth / 2;
            }

            if (options.at[1] === "bottom") {
                basePosition.top += targetHeight;
            } else if (options.at[1] === "center") {
                basePosition.top += targetHeight / 2;
            }

            atOffset = getOffsets(offsets.at, targetWidth, targetHeight);
            basePosition.left += atOffset[0];
            basePosition.top += atOffset[1];

            return this.each(function() {
                var collisionPosition, using,
                    elem = $(this),
                    elemWidth = elem.outerWidth(),
                    elemHeight = elem.outerHeight(),
                    marginLeft = parseCss(this, "marginLeft"),
                    marginTop = parseCss(this, "marginTop"),
                    collisionWidth = elemWidth + marginLeft + parseCss(this, "marginRight") + scrollInfo.width,
                    collisionHeight = elemHeight + marginTop + parseCss(this, "marginBottom") + scrollInfo.height,
                    position = $.extend({}, basePosition),
                    myOffset = getOffsets(offsets.my, elem.outerWidth(), elem.outerHeight());

                if (options.my[0] === "right") {
                    position.left -= elemWidth;
                } else if (options.my[0] === "center") {
                    position.left -= elemWidth / 2;
                }

                if (options.my[1] === "bottom") {
                    position.top -= elemHeight;
                } else if (options.my[1] === "center") {
                    position.top -= elemHeight / 2;
                }

                position.left += myOffset[0];
                position.top += myOffset[1];

                // if the browser doesn't support fractions, then round for consistent results
                if (!supportsOffsetFractions) {
                    position.left = round(position.left);
                    position.top = round(position.top);
                }

                collisionPosition = {
                    marginLeft: marginLeft,
                    marginTop: marginTop
                };

                $.each(["left", "top"], function(i, dir) {
                    if ($.ui.position[collision[i]]) {
                        $.ui.position[collision[i]][dir](position, {
                            targetWidth: targetWidth,
                            targetHeight: targetHeight,
                            elemWidth: elemWidth,
                            elemHeight: elemHeight,
                            collisionPosition: collisionPosition,
                            collisionWidth: collisionWidth,
                            collisionHeight: collisionHeight,
                            offset: [atOffset[0] + myOffset[0], atOffset[1] + myOffset[1]],
                            my: options.my,
                            at: options.at,
                            within: within,
                            elem: elem
                        });
                    }
                });

                if (options.using) {
                    // adds feedback as second argument to using callback, if present
                    using = function(props) {
                        var left = targetOffset.left - position.left,
                            right = left + targetWidth - elemWidth,
                            top = targetOffset.top - position.top,
                            bottom = top + targetHeight - elemHeight,
                            feedback = {
                                target: {
                                    element: target,
                                    left: targetOffset.left,
                                    top: targetOffset.top,
                                    width: targetWidth,
                                    height: targetHeight
                                },
                                element: {
                                    element: elem,
                                    left: position.left,
                                    top: position.top,
                                    width: elemWidth,
                                    height: elemHeight
                                },
                                horizontal: right < 0 ? "left" : left > 0 ? "right" : "center",
                                vertical: bottom < 0 ? "top" : top > 0 ? "bottom" : "middle"
                            };
                        if (targetWidth < elemWidth && abs(left + right) < targetWidth) {
                            feedback.horizontal = "center";
                        }
                        if (targetHeight < elemHeight && abs(top + bottom) < targetHeight) {
                            feedback.vertical = "middle";
                        }
                        if (max(abs(left), abs(right)) > max(abs(top), abs(bottom))) {
                            feedback.important = "horizontal";
                        } else {
                            feedback.important = "vertical";
                        }
                        options.using.call(this, props, feedback);
                    };
                }

                elem.offset($.extend(position, {
                    using: using
                }));
            });
        };

        $.ui.position = {
            fit: {
                left: function(position, data) {
                    var within = data.within,
                        withinOffset = within.isWindow ? within.scrollLeft : within.offset.left,
                        outerWidth = within.width,
                        collisionPosLeft = position.left - data.collisionPosition.marginLeft,
                        overLeft = withinOffset - collisionPosLeft,
                        overRight = collisionPosLeft + data.collisionWidth - outerWidth - withinOffset,
                        newOverRight;

                    // element is wider than within
                    if (data.collisionWidth > outerWidth) {
                        // element is initially over the left side of within
                        if (overLeft > 0 && overRight <= 0) {
                            newOverRight = position.left + overLeft + data.collisionWidth - outerWidth - withinOffset;
                            position.left += overLeft - newOverRight;
                            // element is initially over right side of within
                        } else if (overRight > 0 && overLeft <= 0) {
                            position.left = withinOffset;
                            // element is initially over both left and right sides of within
                        } else {
                            if (overLeft > overRight) {
                                position.left = withinOffset + outerWidth - data.collisionWidth;
                            } else {
                                position.left = withinOffset;
                            }
                        }
                        // too far left -> align with left edge
                    } else if (overLeft > 0) {
                        position.left += overLeft;
                        // too far right -> align with right edge
                    } else if (overRight > 0) {
                        position.left -= overRight;
                        // adjust based on position and margin
                    } else {
                        position.left = max(position.left - collisionPosLeft, position.left);
                    }
                },
                top: function(position, data) {
                    var within = data.within,
                        withinOffset = within.isWindow ? within.scrollTop : within.offset.top,
                        outerHeight = data.within.height,
                        collisionPosTop = position.top - data.collisionPosition.marginTop,
                        overTop = withinOffset - collisionPosTop,
                        overBottom = collisionPosTop + data.collisionHeight - outerHeight - withinOffset,
                        newOverBottom;

                    // element is taller than within
                    if (data.collisionHeight > outerHeight) {
                        // element is initially over the top of within
                        if (overTop > 0 && overBottom <= 0) {
                            newOverBottom = position.top + overTop + data.collisionHeight - outerHeight - withinOffset;
                            position.top += overTop - newOverBottom;
                            // element is initially over bottom of within
                        } else if (overBottom > 0 && overTop <= 0) {
                            position.top = withinOffset;
                            // element is initially over both top and bottom of within
                        } else {
                            if (overTop > overBottom) {
                                position.top = withinOffset + outerHeight - data.collisionHeight;
                            } else {
                                position.top = withinOffset;
                            }
                        }
                        // too far up -> align with top
                    } else if (overTop > 0) {
                        position.top += overTop;
                        // too far down -> align with bottom edge
                    } else if (overBottom > 0) {
                        position.top -= overBottom;
                        // adjust based on position and margin
                    } else {
                        position.top = max(position.top - collisionPosTop, position.top);
                    }
                }
            },
            flip: {
                left: function(position, data) {
                    var within = data.within,
                        withinOffset = within.offset.left + within.scrollLeft,
                        outerWidth = within.width,
                        offsetLeft = within.isWindow ? within.scrollLeft : within.offset.left,
                        collisionPosLeft = position.left - data.collisionPosition.marginLeft,
                        overLeft = collisionPosLeft - offsetLeft,
                        overRight = collisionPosLeft + data.collisionWidth - outerWidth - offsetLeft,
                        myOffset = data.my[0] === "left" ?
                        -data.elemWidth :
                        data.my[0] === "right" ?
                        data.elemWidth :
                        0,
                        atOffset = data.at[0] === "left" ?
                        data.targetWidth :
                        data.at[0] === "right" ?
                        -data.targetWidth :
                        0,
                        offset = -2 * data.offset[0],
                        newOverRight,
                        newOverLeft;

                    if (overLeft < 0) {
                        newOverRight = position.left + myOffset + atOffset + offset + data.collisionWidth - outerWidth - withinOffset;
                        if (newOverRight < 0 || newOverRight < abs(overLeft)) {
                            position.left += myOffset + atOffset + offset;
                        }
                    } else if (overRight > 0) {
                        newOverLeft = position.left - data.collisionPosition.marginLeft + myOffset + atOffset + offset - offsetLeft;
                        if (newOverLeft > 0 || abs(newOverLeft) < overRight) {
                            position.left += myOffset + atOffset + offset;
                        }
                    }
                },
                top: function(position, data) {
                    var within = data.within,
                        withinOffset = within.offset.top + within.scrollTop,
                        outerHeight = within.height,
                        offsetTop = within.isWindow ? within.scrollTop : within.offset.top,
                        collisionPosTop = position.top - data.collisionPosition.marginTop,
                        overTop = collisionPosTop - offsetTop,
                        overBottom = collisionPosTop + data.collisionHeight - outerHeight - offsetTop,
                        top = data.my[1] === "top",
                        myOffset = top ?
                        -data.elemHeight :
                        data.my[1] === "bottom" ?
                        data.elemHeight :
                        0,
                        atOffset = data.at[1] === "top" ?
                        data.targetHeight :
                        data.at[1] === "bottom" ?
                        -data.targetHeight :
                        0,
                        offset = -2 * data.offset[1],
                        newOverTop,
                        newOverBottom;
                    if (overTop < 0) {
                        newOverBottom = position.top + myOffset + atOffset + offset + data.collisionHeight - outerHeight - withinOffset;
                        if ((position.top + myOffset + atOffset + offset) > overTop && (newOverBottom < 0 || newOverBottom < abs(overTop))) {
                            position.top += myOffset + atOffset + offset;
                        }
                    } else if (overBottom > 0) {
                        newOverTop = position.top - data.collisionPosition.marginTop + myOffset + atOffset + offset - offsetTop;
                        if ((position.top + myOffset + atOffset + offset) > overBottom && (newOverTop > 0 || abs(newOverTop) < overBottom)) {
                            position.top += myOffset + atOffset + offset;
                        }
                    }
                }
            },
            flipfit: {
                left: function() {
                    $.ui.position.flip.left.apply(this, arguments);
                    $.ui.position.fit.left.apply(this, arguments);
                },
                top: function() {
                    $.ui.position.flip.top.apply(this, arguments);
                    $.ui.position.fit.top.apply(this, arguments);
                }
            }
        };

        // fraction support test
        (function() {
            var testElement, testElementParent, testElementStyle, offsetLeft, i,
                body = document.getElementsByTagName("body")[0],
                div = document.createElement("div");

            //Create a "fake body" for testing based on method used in jQuery.support
            testElement = document.createElement(body ? "div" : "body");
            testElementStyle = {
                visibility: "hidden",
                width: 0,
                height: 0,
                border: 0,
                margin: 0,
                background: "none"
            };
            if (body) {
                $.extend(testElementStyle, {
                    position: "absolute",
                    left: "-1000px",
                    top: "-1000px"
                });
            }
            for (i in testElementStyle) {
                testElement.style[i] = testElementStyle[i];
            }
            testElement.appendChild(div);
            testElementParent = body || document.documentElement;
            testElementParent.insertBefore(testElement, testElementParent.firstChild);

            div.style.cssText = "position: absolute; left: 10.7432222px;";

            offsetLeft = $(div).offset().left;
            supportsOffsetFractions = offsetLeft > 10 && offsetLeft < 11;

            testElement.innerHTML = "";
            testElementParent.removeChild(testElement);
        })();

    })();

    return $.ui.position;

}));
