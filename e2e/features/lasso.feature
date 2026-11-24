Feature: The Lasso stays as it is and never gets stuck

  Scenario: S1 A loop round a drawing selects it  [LS-12, LS-22, LS-32]
    Given a page with a small drawing
    And the Lasso tool is picked
    When I draw a loop round the whole drawing with the Pencil
    Then the drawing is selected, with its dashed box and handles
    And the Lasso bar shows

  @ipad
  Scenario: S2 The words under the Lasso never react  [LS-01, LS-N3, LS-N4]
    Given a text box with the words "Service 23-11 2000 rate-is"
    And the Lasso tool is picked with Picks set to Ink only
    When I draw a loop over the words with the Pencil
    Then no word is selected, typed, deleted or moved
    And Apple's own bar does not show

  Scenario: S3 With Text picked, a loop takes whole words  [LS-13]
    Given a text box with the words "Service 23-11 2000 rate-is"
    And the Lasso tool is picked with Picks set to Text
    When I draw a loop round "2000 rate-is"
    Then exactly "2000 rate-is" is selected

  Scenario: S4 A new loop lets go of the old selection  [LS-07, LS-N2]
    Given a drawing is selected with the Lasso
    When I draw a new loop round another drawing
    Then only the other drawing is selected
    And the first drawing has not moved or changed

  Scenario: S5 Moving a selection is one Undo  [LS-26, LS-41]
    Given a drawing is selected with the Lasso
    When I drag it to a new place
    And I undo once
    Then the drawing is back where it was

  @ipad @notbuilt @fail
  Scenario: S6 A missed lift still finishes the loop  [LS-50, LS-51, LS-N1]
    Given I am drawing a loop round a drawing with the Lasso
    When the iPad does not report that the Pencil lifted
    And the Pencil moves away in the air
    Then the drawing is selected, as after a normal lift
    And no loop line is left on the screen

  @ipad @notbuilt @fail
  Scenario: S7 The next loop always starts fresh  [LS-52, LS-N2, LS-N5]
    Given a loop whose lift was missed is still open
    When I touch the page again and draw a loop round another drawing
    Then the new loop starts at once
    And only the other drawing is selected

  Scenario: S8 A stroke outside the selection never changes it  [LS-53]
    Given a drawing is selected with the Lasso
    When I draw a stroke that starts outside its dashed box
    Then the selected drawing has not moved, resized or changed

  @notbuilt @fail
  Scenario: S9 A loop that starts in the margin is just as safe  [LS-54]
    Given I am drawing a loop that started in the page margin
    When the iPad does not report that the Pencil lifted
    And the Pencil moves away in the air
    Then what is inside the loop is selected
    And no loop line is left on the screen

  @ipad
  Scenario: S10 A resting hand changes nothing
    Given a drawing is selected with the Lasso
    And my hand rests on the screen
    When I draw a new loop round another drawing with the Pencil
    Then only the other drawing is selected
    And the first drawing has not moved or turned
    And no typing cursor was placed
