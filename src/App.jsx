import React, { useState, useEffect } from "react";
import styles from "./App.module.css";
import resourcesData from "./data/resources.json";
import recipesData from "./data/recipes.json";

function App() {
  const [inventory, setInventory] = useState(() => {
    const saved = localStorage.getItem("inventory");
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.length >= 20 ? parsed : Array(20).fill(null);
    }
    return Array(20).fill(null);
  });
  const [craftingGrid, setCraftingGrid] = useState(Array(9).fill(null));
  const [craftResult, setCraftResult] = useState(null);
  const [discovered, setDiscovered] = useState(() => {
    const saved = localStorage.getItem("discovered");
    return saved ? JSON.parse(saved) : [];
  });
  const [showWinMessage, setShowWinMessage] = useState(false);
  const finalItemId = "final-item";

  useEffect(() => {
    localStorage.setItem("inventory", JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem("discovered", JSON.stringify(discovered));
  }, [discovered]);

  useEffect(() => {
    checkRecipe();
  }, [craftingGrid]);

  const hasEnoughResources = (recipe) => {
    const required = new Map();
    recipe.ingredients.flat().forEach((id) => {
      if (id) {
        required.set(id, (required.get(id) || 0) + 1);
      }
    });
    for (let [id, countRequired] of required) {
      const countAvailable = inventory.filter(slot => slot && slot.id === id).length;
      if (countAvailable < countRequired) {
        return false;
      }
    }
    return true;
  };

  const getItemData = (id) => {
    const res = resourcesData.find((r) => r.id === id);
    if (res) return res;
    const rec = recipesData.find((r) => r.result.id === id);
    if (rec) return rec.result;
    return null;
  };

  const addItemToInventory = (item) => {
    setInventory((prevInv) => {
      const emptyIndex = prevInv.findIndex(slot => slot === null);
      if (emptyIndex !== -1) {
        const newInv = [...prevInv];
        newInv[emptyIndex] = item;
        return newInv;
      } else {
        return [...prevInv, item];
      }
    });
  };

  const removeItemFromInventory = (item, fromIndex) => {
    setInventory((prevInv) => {
      const newInv = [...prevInv];
      newInv[fromIndex] = null;
      return newInv;
    });
  };

  const checkRecipe = () => {
    setCraftResult(null);
    const craftingPattern = [
      craftingGrid.slice(0, 3).map((item) => (item ? item.id : null)),
      craftingGrid.slice(3, 6).map((item) => (item ? item.id : null)),
      craftingGrid.slice(6, 9).map((item) => (item ? item.id : null)),
    ];

    const matchFound = recipesData.find((recipe) => {
      const recipePattern = recipe.ingredients;
      if (recipePattern.length > 3 || recipePattern[0].length > 3) return false;

      for (let rowOffset = 0; rowOffset <= craftingPattern.length - recipePattern.length; rowOffset++) {
        for (let colOffset = 0; colOffset <= craftingPattern[0].length - recipePattern[0].length; colOffset++) {
          let isMatch = true;
          for (let i = 0; i < recipePattern.length; i++) {
            for (let j = 0; j < recipePattern[i].length; j++) {
              const gridRow = rowOffset + i;
              const gridCol = colOffset + j;
              if (craftingPattern[gridRow][gridCol] !== recipePattern[i][j]) {
                isMatch = false;
                break;
              }
            }
            if (!isMatch) break;
          }
          if (isMatch) return true;
        }
      }
      return false;
    });

    if (matchFound) {
      setCraftResult(matchFound.result);
    }
  };

  const handleDragStart = (e, item, source, fromIndex = null) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ id: item.id, source, fromIndex }));
  };

  const handleDropCrafting = (e, index) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData("text/plain"));
    const itemData = getItemData(data.id);
    if (!itemData) return;

    if (data.source === "inventory") {
      const fromIndex = parseInt(data.fromIndex);
      if (craftingGrid[index]) {
        addItemToInventory(craftingGrid[index]);
      }
      setCraftingGrid(prevGrid => {
        const newGrid = [...prevGrid];
        newGrid[index] = itemData;
        return newGrid;
      });
      removeItemFromInventory(itemData, fromIndex);
    } else if (data.source === "crafting") {
      const fromIndex = parseInt(data.fromIndex);
      if (fromIndex !== index) {
        setCraftingGrid(prevGrid => {
          const newGrid = [...prevGrid];
          const temp = newGrid[index];
          newGrid[index] = newGrid[fromIndex];
          newGrid[fromIndex] = temp;
          return newGrid;
        });
      }
    }
  };

  const handleDropInventory = (e, toIndex = null) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData("text/plain"));
    if (data.source === "crafting") {
      const fromIndex = parseInt(data.fromIndex);
      const itemToReturn = craftingGrid[fromIndex];
      if (itemToReturn) {
        addItemToInventory(itemToReturn);
        setCraftingGrid(prevGrid => {
          const newGrid = [...prevGrid];
          newGrid[fromIndex] = null;
          return newGrid;
        });
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const clearSlot = (index) => {
    const itemToReturn = craftingGrid[index];
    if (itemToReturn) {
      addItemToInventory(itemToReturn);
      setCraftingGrid((prevGrid) => {
        const newGrid = [...prevGrid];
        newGrid[index] = null;
        return newGrid;
      });
    }
  };

  const confirmCraft = () => {
    if (craftResult) {
      addItemToInventory(craftResult);
      if (craftResult.id === finalItemId) {
        setShowWinMessage(true);
      }
      setCraftingGrid(Array(9).fill(null));
      setCraftResult(null);
      setDiscovered((prev) => {
        if (!prev.includes(craftResult.id)) {
          return [...prev, craftResult.id];
        }
        return prev;
      });
    }
  };

  const resetGame = () => {
    setInventory(Array(20).fill(null));
    setCraftingGrid(Array(9).fill(null));
    setCraftResult(null);
    setDiscovered([]);
    setShowWinMessage(false);
    localStorage.clear();
  };

  const discoverable = recipesData.filter((recipe) => {
    const resultId = recipe.result.id;
    return !discovered.includes(resultId) && hasEnoughResources(recipe);
  });

  return (
    <div className={styles.app}>
      <h1>Joc de Crafting</h1>
      <button className={styles.resetButton} onClick={resetGame}>Resetează Jocul</button>
      <div className={styles.gameContainer}>
        <div className={styles.craftingArea}>
          <h2>Zona de Crafting</h2>
          <div className={styles.gridContainer}>
            <div className={styles.grid}>
              {craftingGrid.map((item, index) => (
                <div
                  key={index}
                  className={styles.slot}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropCrafting(e, index)}
                  onClick={() => clearSlot(index)}
                >
                  {item && (
                    <div
                      className={styles.item}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item, "crafting", index)}
                    >
                      <img src={item.image} alt={item.name} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className={styles.resultArea}>
              {craftResult ? (
                <div className={styles.resultItem}>
                  <img src={craftResult.image} alt={craftResult.name} />
                  <p>{craftResult.name}</p>
                  <button className={styles.craftButton} onClick={confirmCraft}>Creează!</button>
                </div>
              ) : (
                <div className={styles.noResult}>Așteaptă o rețetă...</div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.discoveryPanel}>
          <h2>Rețete Disponibile</h2>
          <div className={styles.recipesGrid}>
            {discovered.length > 0 && (
              <>
                <h3>Descoperite:</h3>
                {discovered.map((id) => {
                  const data = getItemData(id);
                  if (!data) return null;
                  return (
                    <div key={id} className={styles.recipeItem}>
                      <img src={data.image} alt={data.name} />
                      <p>{data.name}</p>
                    </div>
                  );
                })}
              </>
            )}
            <h3>Pot fi create:</h3>
            {discoverable.length === 0 ? (
              <p>Adună mai multe resurse!</p>
            ) : (
              discoverable.map((recipe) => (
                <div key={recipe.id} className={styles.recipeItem}>
                  <img src={recipe.result.image} alt={recipe.result.name} />
                  <p>{recipe.result.name}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className={`${styles.inventory} ${styles.inventoryBottom}`} onDrop={handleDropInventory} onDragOver={handleDragOver}>
        <h2>Inventar ({inventory.filter(Boolean).length}/{inventory.length} sloturi)</h2>
        <div className={styles.grid}>
          {inventory.map((slot, index) => (
            <div
              key={index}
              className={`${styles.slot} ${styles.inventorySlot}`}
            >
              {slot ? (
                <div
                  className={styles.item}
                  draggable
                  onDragStart={(e) => handleDragStart(e, slot, "inventory", index)}
                >
                  <img src={slot.image} alt={slot.name} />
                  <span>{slot.name}</span>
                </div>
              ) : (
                <div className={styles.emptySlot}>Gol</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showWinMessage && (
        <div className={styles.winMessage}>
          <h2>Felicitări! Ai creat obiectul final! 🎉</h2>
          <p>Poți reseta jocul pentru a începe din nou.</p>
        </div>
      )}

      {/* Am mutat butoanele de adăugare resurse într-un alt container pentru a le separa vizual */}
      <div className={styles.resourcesSection}>
        <h3>Adaugă Resurse de Bază</h3>
        {resourcesData.map((res) => (
          <button key={res.id} onClick={() => addItemToInventory(res)}>
            Adaugă {res.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;