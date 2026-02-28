# Random number generation

Many games rely on randomness to implement core game mechanics. This page guides you through common types of randomness and how to implement them in Godot.

After giving you a brief overview of useful functions that generate random numbers, you will learn how to get random elements from arrays, dictionaries, and how to use a noise generator in GDScript. Lastly, we'll take a look at cryptographically secure random number generation and how it differs from typical random number generation.

> [!NOTE]
> Computers cannot generate "true" random numbers. Instead, they rely on [pseudorandom number generators](https://en.wikipedia.org/wiki/Pseudorandom_number_generator) (PRNGs).
>
> Godot internally uses the [PCG Family](https://www.pcg-random.org/) of pseudorandom number generators.

## Global scope versus RandomNumberGenerator class

Godot exposes two ways to generate random numbers: via *global scope* methods or using the `class_RandomNumberGenerator` class.

Global scope methods are easier to set up, but they don't offer as much control.

RandomNumberGenerator requires more code to use, but allows creating multiple instances, each with their own seed and state.

This tutorial uses global scope methods, except when the method only exists in the RandomNumberGenerator class.

## The randomize() method

> [!NOTE]
> Since Godot 4.0, the random seed is automatically set to a random value when the project starts. This means you don't need to call `randomize()` in `_ready()` anymore to ensure that results are random across project runs. However, you can still use `randomize()` if you want to use a specific seed number, or generate it using a different method.

In global scope, you can find a `randomize()
<class_@GlobalScope_method_randomize>` method. **This method should be called only once when your project starts to initialize the random seed.** Calling it multiple times is unnecessary and may impact performance negatively.

Putting it in your main scene script's `_ready()` method is a good choice:

<div class="tabs">

.. code-tab:: gdscript GDScript

func <span id="ready">ready</span>():  
randomize()

<div class="code-tab">

csharp

</div>

public override void <span id="ready">Ready</span>() { GD.Randomize(); }

</div>

You can also set a fixed random seed instead using `seed()
<class_@GlobalScope_method_seed>`. Doing so will give you *deterministic* results across runs:

<div class="tabs">

.. code-tab:: gdscript GDScript

func <span id="ready">ready</span>():  
seed(12345) \# To use a string as a seed, you can hash it to a number. seed("Hello world".hash())

<div class="code-tab">

csharp

</div>

public override void <span id="ready">Ready</span>() { GD.Seed(12345); // To use a string as a seed, you can hash it to a number. GD.Seed("Hello world".Hash()); }

</div>

When using the RandomNumberGenerator class, you should call `randomize()` on the instance since it has its own seed:

<div class="tabs">

.. code-tab:: gdscript GDScript

var random = RandomNumberGenerator.new() random.randomize()

<div class="code-tab">

csharp

</div>

var random = new RandomNumberGenerator(); random.Randomize();

</div>

## Getting a random number

Let's look at some of the most commonly used functions and methods to generate random numbers in Godot.

The function `randi() <class_@GlobalScope_method_randi>` returns a random number between `0` and `2^32 - 1`. Since the maximum value is huge, you most likely want to use the modulo operator (`%`) to bound the result between 0 and the denominator:

<div class="tabs">

.. code-tab:: gdscript GDScript

\# Prints a random integer between 0 and 49. print(randi() % 50)

\# Prints a random integer between 10 and 60. print(randi() % 51 + 10)

<div class="code-tab">

csharp

</div>

// Prints a random integer between 0 and 49. GD.Print(GD.Randi() % 50);

// Prints a random integer between 10 and 60. GD.Print(GD.Randi() % 51 + 10);

</div>

`randf() <class_@GlobalScope_method_randf>` returns a random floating-point number between 0 and 1. This is useful to implement a `doc_random_number_generation_weighted_random_probability` system, among other things.

`randfn() <class_@GlobalScope_method_randfn>` returns a random floating-point number following a [normal distribution](https://en.wikipedia.org/wiki/Normal_distribution). This means the returned value is more likely to be around the mean (0.0 by default), varying by the deviation (1.0 by default):

<div class="tabs">

.. code-tab:: gdscript GDScript

\# Prints a random floating-point number from a normal distribution with a mean 0.0 and deviation 1.0. print(randfn(0.0, 1.0))

<div class="code-tab">

csharp

</div>

// Prints a random floating-point number from a normal distribution with a mean 0.0 and deviation 1.0. GD.Print(GD.Randfn(0.0, 1.0));

</div>

`randf_range() <class_@GlobalScope_method_randf_range>` takes two arguments `from` and `to`, and returns a random floating-point number between `from` and `to`:

<div class="tabs">

.. code-tab:: gdscript GDScript

\# Prints a random floating-point number between -4 and 6.5. print(randf_range(-4, 6.5))

<div class="code-tab">

csharp

</div>

// Prints a random floating-point number between -4 and 6.5. GD.Print(GD.RandRange(-4.0, 6.5));

</div>

`randi_range() <class_@GlobalScope_method_randi_range>` takes two arguments `from` and `to`, and returns a random integer between `from` and `to`:

<div class="tabs">

.. code-tab:: gdscript GDScript

\# Prints a random integer between -10 and 10. print(randi_range(-10, 10))

<div class="code-tab">

csharp

</div>

// Prints a random integer number between -10 and 10. GD.Print(GD.RandRange(-10, 10));

</div>

## Get a random array element

We can use random integer generation to get a random element from an array, or use the `Array.pick_random<class_Array_method_pick_random>` method to do it for us:

<div class="tabs">

.. code-tab:: gdscript GDScript

var <span id="fruits">fruits</span> = \["apple", "orange", "pear", "banana"\]

func <span id="ready">ready</span>():  
for i in range(100):  
\# Pick 100 fruits randomly. print(get_fruit())

for i in range(100):  
\# Pick 100 fruits randomly, this time using the <span class="title-ref">Array.pick_random()</span> \# helper method. This has the same behavior as <span class="title-ref">get_fruit()</span>. print(<span id="fruits.pick_random">fruits.pick_random</span>())

func get_fruit():  
var random_fruit = <span id="fruits">fruits</span>\[randi() % <span id="fruits.size">fruits.size</span>()\] \# Returns "apple", "orange", "pear", or "banana" every time the code runs. \# We may get the same fruit multiple times in a row. return random_fruit

<div class="code-tab">

csharp

</div>

// Use Godot's Array type instead of a BCL type so we can use <span class="title-ref">PickRandom()</span> on it. private Godot.Collections.Array\<string\> <span id="fruits">fruits</span> = \["apple", "orange", "pear", "banana"\];

public override void <span id="ready">Ready</span>() { for (int i = 0; i \< 100; i++) { // Pick 100 fruits randomly. GD.Print(GetFruit()); }

> for (int i = 0; i \< 100; i++) { // Pick 100 fruits randomly, this time using the <span class="title-ref">Array.PickRandom()</span> // helper method. This has the same behavior as <span class="title-ref">GetFruit()</span>. GD.Print(<span id="fruits.pickrandom">fruits.PickRandom</span>()); }

}

public string GetFruit() { string randomFruit = <span id="fruits">fruits</span>\[GD.Randi() % <span id="fruits.size">fruits.Size</span>()\]; // Returns "apple", "orange", "pear", or "banana" every time the code runs. // We may get the same fruit multiple times in a row. return randomFruit; }

</div>

To prevent the same fruit from being picked more than once in a row, we can add more logic to the above method. In this case, we can't use `Array.pick_random<class_Array_method_pick_random>` since it lacks a way to prevent repetition:

<div class="tabs">

.. code-tab:: gdscript GDScript

var <span id="fruits">fruits</span> = \["apple", "orange", "pear", "banana"\] var <span id="last_fruit">last_fruit</span> = ""

func <span id="ready">ready</span>():  
\# Pick 100 fruits randomly. for i in range(100): print(get_fruit())

func get_fruit():  
var random_fruit = <span id="fruits">fruits</span>\[randi() % <span id="fruits.size">fruits.size</span>()\] while random_fruit == <span id="last_fruit">last_fruit</span>: \# The last fruit was picked. Try again until we get a different fruit. random_fruit = <span id="fruits">fruits</span>\[randi() % <span id="fruits.size">fruits.size</span>()\]

\# Note: if the random element to pick is passed by reference, \# such as an array or dictionary, \# use <span class="title-ref">\_last_fruit = random_fruit.duplicate()</span> instead. <span id="last_fruit">last_fruit</span> = random_fruit

\# Returns "apple", "orange", "pear", or "banana" every time the code runs. \# The function will never return the same fruit more than once in a row. return random_fruit

<div class="code-tab">

csharp

</div>

private string\[\] <span id="fruits">fruits</span> = \["apple", "orange", "pear", "banana"\]; private string <span id="lastfruit">lastFruit</span> = "";

public override void <span id="ready">Ready</span>() { for (int i = 0; i \< 100; i++) { // Pick 100 fruits randomly. GD.Print(GetFruit()); } }

public string GetFruit() { string randomFruit = <span id="fruits">fruits</span>\[GD.Randi() % <span id="fruits.length">fruits.Length</span>\]; while (randomFruit == <span id="lastfruit">lastFruit</span>) { // The last fruit was picked. Try again until we get a different fruit. randomFruit = <span id="fruits">fruits</span>\[GD.Randi() % <span id="fruits.length">fruits.Length</span>\]; }

> <span id="lastfruit">lastFruit</span> = randomFruit;
>
> // Returns "apple", "orange", "pear", or "banana" every time the code runs. // The function will never return the same fruit more than once in a row. return randomFruit;

}

</div>

This approach can be useful to make random number generation feel less repetitive. Still, it doesn't prevent results from "ping-ponging" between a limited set of values. To prevent this, use the `shuffle bag
<doc_random_number_generation_shuffle_bags>` pattern instead.

## Get a random dictionary value

We can apply similar logic from arrays to dictionaries as well:

<div class="tabs">

.. code-tab:: gdscript GDScript

var <span id="metals">metals</span> = {  
"copper": {"quantity": 50, "price": 50}, "silver": {"quantity": 20, "price": 150}, "gold": {"quantity": 3, "price": 500},

}

func <span id="ready">ready</span>():  
for i in range(20):  
print(get_metal())

func get_metal():  
var random_metal = <span id="metals.values">metals.values</span>()\[randi() % metals.size()\] \# Returns a random metal value dictionary every time the code runs. \# The same metal may be selected multiple times in succession. return random_metal

<div class="code-tab">

csharp

</div>

private Godot.Collections.Dictionary\<string, Godot.Collections.Dictionary\<string, int\>\> <span id="metals">metals</span> = new() { {"copper", new Godot.Collections.Dictionary\<string, int\>{{"quantity", 50}, {"price", 50}}}, {"silver", new Godot.Collections.Dictionary\<string, int\>{{"quantity", 20}, {"price", 150}}}, {"gold", new Godot.Collections.Dictionary\<string, int\>{{"quantity", 3}, {"price", 500}}}, };

public override void <span id="ready">Ready</span>() { for (int i = 0; i \< 20; i++) { GD.Print(GetMetal()); } }

public Godot.Collections.Dictionary\<string, int\> GetMetal() { var (\_, randomMetal) = <span id="metals.elementat">metals.ElementAt</span>((int)(GD.Randi() % <span id="metals.count">metals.Count</span>)); // Returns a random metal value dictionary every time the code runs. // The same metal may be selected multiple times in succession. return randomMetal; }

</div>

## Weighted random probability

The `randf() <class_@GlobalScope_method_randf>` method returns a floating-point number between 0.0 and 1.0. We can use this to create a "weighted" probability where different outcomes have different likelihoods:

<div class="tabs">

.. code-tab:: gdscript GDScript

func <span id="ready">ready</span>():  
for i in range(100):  
print(get_item_rarity())

func get_item_rarity():  
var random_float = randf()

if random_float \< 0.8:  
\# 80% chance of being returned. return "Common"

elif random_float \< 0.95:  
\# 15% chance of being returned. return "Uncommon"

else:  
\# 5% chance of being returned. return "Rare"

<div class="code-tab">

csharp

</div>

public override void <span id="ready">Ready</span>() { for (int i = 0; i \< 100; i++) { GD.Print(GetItemRarity()); } }

public string GetItemRarity() { float randomFloat = GD.Randf();

> if (randomFloat \< 0.8f) { // 80% chance of being returned. return "Common"; } else if (randomFloat \< 0.95f) { // 15% chance of being returned. return "Uncommon"; } else { // 5% chance of being returned. return "Rare"; }

}

</div>

You can also get a weighted random *index* using the `rand_weighted() <class_RandomNumberGenerator_method_rand_weighted>` method on a RandomNumberGenerator instance. This returns a random integer between 0 and the size of the array that is passed as a parameter. Each value in the array is a floating-point number that represents the *relative* likelihood that it will be returned as an index. A higher value means the value is more likely to be returned as an index, while a value of `0` means it will never be returned as an index.

For example, if `[0.5, 1, 1, 2]` is passed as a parameter, then the method is twice as likely to return `3` (the index of the value `2`) and twice as unlikely to return `0` (the index of the value `0.5`) compared to the indices `1` and `2`.

Since the returned value matches the array's size, it can be used as an index to get a value from another array as follows:

<div class="tabs">

.. code-tab:: gdscript GDScript

\# Prints a random element using the weighted index that is returned by <span class="title-ref">rand_weighted()</span>. \# Here, "apple" will be returned twice as rarely as "orange" and "pear". \# "banana" is twice as common as "orange" and "pear", and four times as common as "apple". var fruits = \["apple", "orange", "pear", "banana"\] var probabilities = \[0.5, 1, 1, 2\];

var random = RandomNumberGenerator.new() print(fruits\[random.rand_weighted(probabilities)\])

<div class="code-tab">

csharp

</div>

// Prints a random element using the weighted index that is returned by <span class="title-ref">RandWeighted()</span>. // Here, "apple" will be returned twice as rarely as "orange" and "pear". // "banana" is twice as common as "orange" and "pear", and four times as common as "apple". string\[\] fruits = \["apple", "orange", "pear", "banana"\]; float\[\] probabilities = \[0.5f, 1, 1, 2\];

var random = new RandomNumberGenerator(); GD.Print(fruits\[random.RandWeighted(probabilities)\]);

</div>

## "Better" randomness using shuffle bags

Taking the same example as above, we would like to pick fruits at random. However, relying on random number generation every time a fruit is selected can lead to a less *uniform* distribution. If the player is lucky (or unlucky), they could get the same fruit three or more times in a row.

You can accomplish this using the *shuffle bag* pattern. It works by removing an element from the array after choosing it. After multiple selections, the array ends up empty. When that happens, you reinitialize it to its default value:

<div class="tabs">

.. code-tab:: gdscript GDScript

var <span id="fruits">fruits</span> = \["apple", "orange", "pear", "banana"\] \# A copy of the fruits array so we can restore the original value into <span class="title-ref">fruits</span>. var <span id="fruits_full">fruits_full</span> = \[\]

func <span id="ready">ready</span>():  
<span id="fruits_full">fruits_full</span> = <span id="fruits.duplicate">fruits.duplicate</span>() <span id="fruits.shuffle">fruits.shuffle</span>()

for i in 100:  
print(get_fruit())

func get_fruit():  
if <span id="fruits.is_empty">fruits.is_empty</span>():  
\# Fill the fruits array again and shuffle it. <span id="fruits">fruits</span> = <span id="fruits_full.duplicate">fruits_full.duplicate</span>() <span id="fruits.shuffle">fruits.shuffle</span>()

\# Get a random fruit, since we shuffled the array, \# and remove it from the <span class="title-ref">\_fruits</span> array. var random_fruit = <span id="fruits.pop_front">fruits.pop_front</span>() \# Returns "apple", "orange", "pear", or "banana" every time the code runs, removing it from the array. \# When all fruit are removed, it refills the array. return random_fruit

<div class="code-tab">

csharp

</div>

private Godot.Collections.Array\<string\> <span id="fruits">fruits</span> = \["apple", "orange", "pear", "banana"\]; // A copy of the fruits array so we can restore the original value into <span class="title-ref">fruits</span>. private Godot.Collections.Array\<string\> <span id="fruitsfull">fruitsFull</span>;

public override void <span id="ready">Ready</span>() { <span id="fruitsfull">fruitsFull</span> = <span id="fruits.duplicate">fruits.Duplicate</span>(); <span id="fruits.shuffle">fruits.Shuffle</span>();

> for (int i = 0; i \< 100; i++) { GD.Print(GetFruit()); }

}

public string GetFruit() { if(<span id="fruits.count">fruits.Count</span> == 0) { // Fill the fruits array again and shuffle it. <span id="fruits">fruits</span> = <span id="fruitsfull.duplicate">fruitsFull.Duplicate</span>(); <span id="fruits.shuffle">fruits.Shuffle</span>(); }

> // Get a random fruit, since we shuffled the array, string randomFruit = <span id="fruits">fruits</span>\[0\]; // and remove it from the <span class="title-ref">\_fruits</span> array. <span id="fruits.removeat">fruits.RemoveAt</span>(0); // Returns "apple", "orange", "pear", or "banana" every time the code runs, removing it from the array. // When all fruit are removed, it refills the array. return randomFruit;

}

</div>

When running the above code, there is a chance to get the same fruit twice in a row. Once we picked a fruit, it will no longer be a possible return value unless the array is now empty. When the array is empty, we reset it back to its default value, making it possible to have the same fruit again, but only once.

## Random noise

The random number generation shown above can show its limits when you need a value that *slowly* changes depending on the input. The input can be a position, time, or anything else.

To achieve this, you can use random *noise* functions. Noise functions are especially popular in procedural generation to generate realistic-looking terrain. Godot provides `class_fastnoiselite` for this, which supports 1D, 2D and 3D noise. Here's an example with 1D noise:

<div class="tabs">

.. code-tab:: gdscript GDScript

var <span id="noise">noise</span> = FastNoiseLite.new()

func <span id="ready">ready</span>():  
\# Configure the FastNoiseLite instance. <span id="noise.noise_type">noise.noise_type</span> = FastNoiseLite.NoiseType.TYPE_SIMPLEX_SMOOTH <span id="noise.seed">noise.seed</span> = randi() <span id="noise.fractal_octaves">noise.fractal_octaves</span> = 4 <span id="noise.frequency">noise.frequency</span> = 1.0 / 20.0

for i in 100:  
\# Prints a slowly-changing series of floating-point numbers \# between -1.0 and 1.0. print(<span id="noise.get_noise_1d">noise.get_noise_1d</span>(i))

<div class="code-tab">

csharp

</div>

private FastNoiseLite <span id="noise">noise</span> = new FastNoiseLite();

public override void <span id="ready">Ready</span>() { // Configure the FastNoiseLite instance. <span id="noise.noisetype">noise.NoiseType</span> = FastNoiseLite.NoiseTypeEnum.SimplexSmooth; <span id="noise.seed">noise.Seed</span> = (int)GD.Randi(); <span id="noise.fractaloctaves">noise.FractalOctaves</span> = 4; <span id="noise.frequency">noise.Frequency</span> = 1.0f / 20.0f;

> for (int i = 0; i \< 100; i++) { GD.Print(<span id="noise.getnoise1d">noise.GetNoise1D</span>(i)); }

}

</div>

## Cryptographically secure pseudorandom number generation

So far, the approaches mentioned above are **not** suitable for *cryptographically secure* pseudorandom number generation (CSPRNG). This is fine for games, but this is not sufficient for scenarios where encryption, authentication or signing is involved.

Godot offers a `class_Crypto` class for this. This class can perform asymmetric key encryption/decryption, signing/verification, while also generating cryptographically secure random bytes, RSA keys, HMAC digests, and self-signed `class_X509Certificate`s.

The downside of `CSPRNG (Cryptographically secure pseudorandom number generation)` is that it's much slower than standard pseudorandom number generation. Its API is also less convenient to use. As a result, `CSPRNG (Cryptographically secure pseudorandom number generation)` should be avoided for gameplay elements.

Example of using the Crypto class to generate 2 random integers between `0` and `2^32 - 1` (inclusive):

    var crypto := Crypto.new()
    # Request as many bytes as you need, but try to minimize the amount
    # of separate requests to improve performance.
    # Each 32-bit integer requires 4 bytes, so we request 8 bytes.
    var byte_array := crypto.generate_random_bytes(8)

    # Use the ``decode_u32()`` method from PackedByteArray to decode a 32-bit unsigned integer
    # from the beginning of `byte_array`. This method doesn't modify `byte_array`.
    var random_int_1 := byte_array.decode_u32(0)
    # Do the same as above, but with an offset of 4 bytes since we've already decoded
    # the first 4 bytes previously.
    var random_int_2 := byte_array.decode_u32(4)

    prints("Random integers:", random_int_1, random_int_2)

<div class="seealso">

See `class_PackedByteArray`'s documentation for other methods you can use to decode the generated bytes into various types of data, such as integers or floats.

</div>
