const adjective = [];
const name = [];
const surname = [];
const cache = new Map();

const parts = [
    adjective,
    name,
    surname,
];

exports.generateName = function () {
    const displayName = parts.map((partSet) => {
        return partSet[Math.floor(Math.random() * partSet.length)];
    }).join(' ');

    let cached = cache.get(displayName);

    if (!cached) {
        cache.set(displayName, cached = { counter: 0 });

        return displayName;
    }

    cached.counter += 1;

    return `${displayName} ${cached.counter}`;
};

adjective.push('Pensive');
adjective.push('Broody');
adjective.push('Cheerful');
adjective.push('Peppy');
adjective.push('Wicked');
adjective.push('Scathing');
adjective.push('Susceptible');

name.push('Butch');
name.push('Tom');
name.push('Nat');
name.push('Bill');
name.push('Doc');
name.push('Chuck');
name.push('Montie');

surname.push('Cassidy');
surname.push('Horn');
surname.push('Love');
surname.push('Picket');
surname.push('Scurlock');
surname.push('Roderson');
surname.push('Montana');
