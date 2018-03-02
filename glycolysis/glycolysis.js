document.addEventListener("DOMContentLoaded", function() {
  var cy = cytoscape({
    container: document.getElementById('cy'),
    elements: GlyElements,
    style: [
      {
        selector: 'node',
        style: {
          'label': 'data(molecule)',
          'width': '200px',
          'height': '200px',
          'background-opacity': 0,
          'background-image': 'data(image)',
          'background-fit': 'contain',
          'background-clip': 'none'
        }
      }, {
        selector: 'edge',
        style: {
          'label': 'data(enzyme)'
        }
      }
    ],
    layout: {
      name: 'grid',
      fit: false,
      columns: 2,
      avoidOverlap: true,
      avoidOverlapPadding: 80,
      position: function(ele) {
        if (ele.data('molecule') === 'DHAP') {
          return { row: ele.id() - 1, col: 1 };
        }
        return { row: ele.id(), col: 0 };
      }
    }
  });
  cy.autolock(true);
});
