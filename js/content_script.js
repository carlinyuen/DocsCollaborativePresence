/* Required:
 * js/third_party/jquery-2.1.0.min.js
 * js/constants.js */

$(function()
{
  // Variables & Constants
  var CLASS_KIX_COLLABORATIVE_CURSOR = 'kix-cursor'
    , CLASS_KIX_DOCUMENT_ZOOM = 'kix-zoomdocumentplugin-outer'
    , CLASS_KIX_DOCOS_PRESENCE = 'docos-user-presence'
    , CLASS_KIX_DOCOS_CONTAINER = 'docos-anchoreddocoview'
  	, CLASS_PRESENCE_MARKER = 'dcp-scrollbar-marker'
    , ID_DOCS_HEADER_CONTROLS = 'docs-chrome'
    , PREFIX_ID_DOCO = 'dcp-'
    , PREFIX_ID_MARKER = 'dcp-marker-'
    , INTERVAL_DOCOS_SWEEPER = 200
  	, cursorObserver = null
  	, positionObservers = []
    , docosTracker = []
	;

  // Initialize
  init();


  /////////////////////////////////////////
  // FUNCTIONS

	// Custom log function
	function debugLog() {
		if (DEBUG && console) {
			console.log.apply(console, arguments);
		}
	}

  // Initialize the extension script
  function init()
  {
    debugLog('Init Docs Collaborative Presence v1.2');

    // Doesn't work -- can't seem to track when inserted
    // $(document).on('DOMNodeInserted', function(e)
    // {
    //   var docos = $(e.target).find("." + CLASS_KIX_DOCOS_CONTAINER);
    //   if (docos.length) {
    //     alert("docos:" + docos.length);
    //   }
    // });

    // Look for docos regularly
    setInterval(sweepDocos, INTERVAL_DOCOS_SWEEPER);

    /*
    // Listen for new cursors being added
    //  Source: http://gabrieleromanato.name/jquery-detecting-new-elements-with-the-mutationobserver-object/
    var target = $("body")[0];

    // Create an observer instance
    cursorObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation)
      {
        // Check inserted nodes
        var newNodes = mutation.addedNodes; // DOM NodeList
        if (newNodes !== null) { // If there are new nodes added
          var $nodes = $(newNodes); // jQuery set
          $nodes.each(function() {
            var $node = $(this);
            if( $node.hasClass(CLASS_KIX_COLLABORATIVE_CURSOR) ) {
              addPositionObserver($node);
            }
          });
        }

        // Check removed nodes
        var removedNodes = mutation.removedNodes;
        if (removedNodes !== null) {
          $nodes = $(removedNodes);
          $nodes.each(function() {
            var $node = $(this);
            if( $node.hasClass(CLASS_KIX_COLLABORATIVE_CURSOR) ) {
              removePositionObserver($node);
            }

          });
        }
      });
    });

  	// Configuration of the observer:
  	var config = {
  		attributes: true,
  		childList: true,
  		characterData: true
  	};

  	// Pass in the target node, as well as the observer options
  	cursorObserver.observe(target, config);
    */
  }

  // Generates unique ID
  function uniqueID() {
    return PREFIX_ID_DOCO + Math.round(new Date().getTime() * (Math.random() * 100));
  }

  // Search for docos
  function sweepDocos()
  {
    // Fetch docos from document
    var $docos = $(document).find('div.' + CLASS_KIX_DOCOS_PRESENCE);

    // Store docos into tracker
    $.each($docos, function(index, value)
    {
      var $doco = $(value);
      if (docosTracker.includes(value)) {
        // Do nothing
      } else if ($doco.attr('id')) {
        docosTracker.push(value);   // Shouldn't happen, but doco has been processed before and isn't tracked
      }
      else  // Doco hasn't been tracked
      {
        var ID = uniqueID();
        $doco.attr('id', ID);
        var $container = $doco.parents('.' + CLASS_KIX_DOCOS_CONTAINER);
        drawDocoMarker($container.css('top').replace("px", "")
          , $container.outerHeight()
          , $doco.css('background-color')
          , PREFIX_ID_MARKER + ID);
        docosTracker.push(value);
      }
    });

    // Need to get rid of removed docos
    docosTracker = $.grep(docosTracker, function(value)
    {
      var id = $(value).attr('id');
      if ($('body').find('#' + id).length <= 0)
      {
        removeDocoMarker(id.substr(PREFIX_ID_DOCO.length));
        return false;
      }
      return true;
      // return ($(value).parents('.' + CLASS_KIX_DOCOS_CONTAINER)
        // .css('top').replace('px', '') > 0);
    });

    redrawDocoMarkers();
  }

  // Draw doco indicators
  function redrawDocoMarkers()
  {
    // clearDocoMarkers();

    // Iterate through docos and redraw
    $.each(docosTracker, function(index, value) {
      var $doco = $(value);
      var id = $doco.attr('id');
      var $container = $doco.parents('.' + CLASS_KIX_DOCOS_CONTAINER);
      drawDocoMarker($container.css('top').replace("px", "")
        , $container.outerHeight()
        , $doco.css('background-color')
        , id.substr(PREFIX_ID_DOCO));
    });
  }

  // Creates a doco indicator, returns jQuery object
  function createDocoMarker(id)
  {
    var $marker = $(document.createElement('div')).addClass(CLASS_PRESENCE_MARKER);
    if (id) {
      $marker.attr('id', id);
    }
    return $marker;
  }

  // Draw a single doco indicator
  function drawDocoMarker(top, height, color, id)
  {
    // debugLog("drawDocoMarker:", top, height, color, id);

    // Create marker
    var $marker, newlyCreated = false;
    if (id) {
      $marker = $('body').find('#' + PREFIX_ID_MARKER + id);
    }
    if ($marker.length <= 0) {
      $marker = createDocoMarker(id);
      newlyCreated = true;
    }

    // Calculate vertical position
    var documentHeight = $('div.' + CLASS_KIX_DOCUMENT_ZOOM).height();
    var headerBarHeight = $('#' + ID_DOCS_HEADER_CONTROLS).height();
    var pageHeight = $('body').height();
    var scrollbarHeightRatio = 1 - (headerBarHeight / pageHeight);
    var css = {   // Set position and height relative to page
      top: Math.floor((top / documentHeight) * 100 * scrollbarHeightRatio) + '%',
      height: Math.floor((height / documentHeight) * 100 * scrollbarHeightRatio) + '%',
      opacity: 0.5,
    };
    // debugLog("css:", css);

    // Add to document if newly created
    if (newlyCreated)
    {
      css.background = color;  // Copy node color style
      $marker.css(css);
      $('body').append($marker).slideDown('fast');
    }
    else {  // Otherwise only animate height changes
      $marker.animate(css, 'fast');
    }
  }

  // Clear all doco indicators
  function clearDocoMarkers() {
    $('.' + CLASS_PRESENCE_MARKER).fadeOut('fast', function(e) { $(this).remove(); });
  }

  // Remove a single doco indicator
  function removeDocoMarker(id) {
    $('#' + id + '.' + CLASS_PRESENCE_MARKER).fadeOut('fast', function(e) { $(this).remove(); });
  }

  // Add an observer to the positioning of the cursor
  // function addPositionObserver($node)
  // {
  //   debugLog('addPositionObserver:', $node);
  //
  //   // Listen for editing
  //   var observer = new MutationObserver(function(mutations) {
  //     mutations.forEach(function(mutationRecord) {
  //       console.log('style changed!');
  //       showMarker(mutationRecord.target);
  //     });
  //   });
  //
  //   var target = $node[0];
  //   observer.observe(target, { attributes : true, attributeFilter : ['style'] });
  //
  //   // Add to positionObservers
  //   positionObservers.push({observer: observer, target: target});
  //
  // }
  //
  // // Remove an observer to the positioning of the cursor
  // function removePositionObserver($node)
  // {
  //   debugLog('removePositionObserver:', $node);
  //
  //   // Remove from positionObservers and disconnect
  //   for (var i = 0, l = positionObservers.length, o; i < l; i++)
  //   {
  //     o = positionObservers[i];
  //     if (o.target == $node) {
  //       debugLog('observer found');
  //       o.observer.disconnect();
  //       positionObservers.splice(i, 1);
  //       break;
  //     }
  //   }
  // }
  //
  // // Show marker for collaborative presence
  // function showMarker(node)
  // {
  //   debugLog('showMarker:', node);
  //
  //   // Create marker
  //   var $node = $(node);
  //   var marker = $(document.createElement('div'))
  //   .addClass(CLASS_PRESENCE_MARKER);
  //
  //   // Calculate vertical position
  //   var verticalPercent = Math.floor(($node.offset().top / $('body').height()) * 100);
  //   marker.css({top: verticalPercent + '%'});
  //
  //   // Copy node color style
  //   marker.css({background: $node.css('background-color')});
  //
  //   // Add to document and fade out over time
  //   $('body').append(marker);
  //   marker.fadeOut(2000, function() {
  //     $(this).remove();
  //   });
  // }

});
