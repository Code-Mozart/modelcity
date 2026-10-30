<script lang="ts">
  // Static legend of the handle vocabulary (^9).
</script>

<footer>
  <span><i class="sw" style="background: var(--ink)"></i>node (drag)</span>
  <span><i class="sw ring" style="border-color: var(--ink)"></i>arrow tip: heading</span>
  <span>
    <i class="sw" style="background: var(--blue)"></i>blue: where the two heading lines meet (drag:
    sets both headings); on an S-curve the inflection point, generated
  </span>
  <span>
    <i class="sw" style="background: var(--teal)"></i>turquoise: corners of the control polygon
  </span>
  <span>
    <i class="sw ring"></i>orange ring: radius (drag; headings stay; both arcs of an S-curve share
    it; double-click resets to the largest that fits)
  </span>
  <span>
    Right-click or Del removes a node. Esc returns to Move. Wheel zooms; drag empty space or the
    middle button pans.
  </span>
</footer>

<style>
  footer {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    padding: 7px 12px;
    border-top: 1px solid var(--line);
    background: var(--panel);
    color: var(--muted);
    font-size: 12.5px;
  }
  .sw {
    display: inline-block;
    width: 10px;
    height: 10px;
    margin-right: 5px;
    border-radius: 50%;
    vertical-align: -1px;
  }
  .ring {
    border: 2px solid var(--orange);
    background: transparent;
  }
</style>
